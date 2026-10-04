"""Mentor agent: a LangGraph ReAct loop — agent node with tools, streaming-friendly."""

import operator
from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from app.ai.llm import get_llm
from app.ai.knowledge_base import KNOWLEDGE
from app.ai.prompts import MENTOR_SYSTEM
from app.ai.tools import build_user_tools
from app.services.stats import overview, topic_analysis


class MentorState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]


def offline_mentor_reply(db, user_id: int, user_name: str, question: str) -> str:
    """Answer profile and DSA questions from local data when Gemini is unavailable."""
    data = overview(db, user_id)
    totals = data["totals"]
    connected = data["platforms"]
    topics = topic_analysis(db, user_id)
    question_lower = question.casefold()
    stats_line = (
        f"Your synced profile has {totals['solved']} solved problems "
        f"({totals['easy']} easy, {totals['medium']} medium, {totals['hard']} hard) "
        f"across {len(connected)} connected platform(s)."
    )
    service_note = (
        "Gemini is unavailable because the backend GOOGLE_API_KEY was rejected. "
        "I’m answering from your synced stats and built-in DSA notes instead."
    )

    if any(word in question_lower for word in ("weak", "practice", "next", "improve", "focus")):
        least_solved = sorted(topics.items(), key=lambda item: (item[1], item[0].casefold()))
        weak = [f"{name} ({count} recorded)" for name, count in least_solved[:3]]
        if weak:
            suggestion = "Your least-practiced tracked topics are " + ", ".join(weak) + ". Start with the first one and solve a small set at your current level."
        elif totals["solved"] < 20:
            suggestion = "There isn’t enough topic history to rank weak areas yet. Start with Arrays & Hashing and Two Pointers, then sync again to personalize the next step."
        else:
            suggestion = "No topic tags were available from the connected profiles, so I can’t rank weak areas yet. Keep syncing and use the plan page for a stats-based schedule."
        return f"{service_note}\n\n{stats_line}\n{suggestion}"

    if any(word in question_lower for word in ("explain", "what is", "how does", "teach me")):
        matches = []
        for entry in KNOWLEDGE:
            title = entry["content"].split(":", 1)[0]
            keywords = {entry["topic"].replace("-", " ").casefold(), title.casefold()}
            if any(keyword in question_lower for keyword in keywords):
                matches.append(entry)
        if matches:
            return f"{service_note}\n\n{matches[0]['content']}\n\n{stats_line}"

    if any(word in question_lower for word in ("plan", "roadmap", "today", "schedule")):
        return (
            f"{service_note}\n\n{stats_line}\n"
            "The plan generator uses these latest synced totals and your recorded topic counts. Open **AI Study Plan** and generate a plan for your goal; if Gemini is unavailable it will build a local profile-based plan."
        )

    platform_line = ", ".join(f"{item['platform']} (@{item['handle']})" for item in connected) or "none yet"
    top_topics = sorted(topics.items(), key=lambda item: (-item[1], item[0].casefold()))[:5]
    topic_line = ", ".join(f"{name} ({count})" for name, count in top_topics) or "no topic tags synced yet"
    return (
        f"{service_note}\n\nHi {user_name}. {stats_line}\n"
        f"Connected profiles: {platform_line}. Most practiced topics: {topic_line}.\n"
        "I can answer questions about your synced totals, suggest a focus from recorded topics, explain a built-in DSA topic, or help you create a stats-based plan."
    )


def build_mentor_graph(db, user_id: int, user_name: str = "there"):
    tools = build_user_tools(db, user_id)
    llm = get_llm(0.6).bind_tools(tools)

    def context_summary() -> str:
        try:
            data = overview(db, user_id)
            totals = data["totals"]
            platforms = ", ".join(p["platform"] for p in data["platforms"]) or "none connected"
            top_topics = ", ".join(t["name"] for t in data["topics"][:5]) or "unknown yet"
            return (
                f"Name: {user_name}. Connected platforms: {platforms}. "
                f"Total solved: {totals['solved']} (E{totals['easy']}/M{totals['medium']}/H{totals['hard']}). "
                f"Best rating: {totals['rating'] or 'N/A'}. Streak: {totals['streak']} days. "
                f"Top topics: {top_topics}."
            )
        except Exception:
            return "Stats unavailable right now."

    def agent_node(state: MentorState) -> dict:
        system = SystemMessage(content=MENTOR_SYSTEM.format(context=context_summary()))
        return {"messages": [llm.invoke([system] + state["messages"])]}

    def should_continue(state: MentorState) -> str:
        last = state["messages"][-1]
        return "tools" if getattr(last, "tool_calls", None) else END

    graph = StateGraph(MentorState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", ToolNode(tools))
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, ["tools", END])
    graph.add_edge("tools", "agent")
    return graph.compile()
