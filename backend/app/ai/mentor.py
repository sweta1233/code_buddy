"""Mentor agent: a LangGraph ReAct loop — agent node with tools, streaming-friendly."""

import operator
from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from app.ai.llm import get_llm
from app.ai.prompts import MENTOR_SYSTEM
from app.ai.tools import build_user_tools
from app.services.stats import overview


class MentorState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]


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
