"""One-time generator: writes the sheet JSON files that seed_sheets() reads.

Run:  uv run python scripts/make_sheets.py   (from backend/)
"""

import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "app" / "services" / "sheets_data"
OUT.mkdir(parents=True, exist_ok=True)


def q(slug, difficulty, topics, title=None):
    return {
        "slug": slug,
        "title": title or slug.replace("-", " ").title(),
        "url": f"https://leetcode.com/problems/{slug}/",
        "difficulty": difficulty,
        "topics": topics,
    }


BLIND75 = [
    # Arrays & hashing
    q("two-sum", "easy", ["Array", "Hash Table"]),
    q("best-time-to-buy-and-sell-stock", "easy", ["Array", "DP"]),
    q("contains-duplicate", "easy", ["Array", "Hash Table"]),
    q("product-of-array-except-self", "medium", ["Array", "Prefix Sum"]),
    q("maximum-subarray", "medium", ["Array", "DP"]),
    q("maximum-product-subarray", "medium", ["Array", "DP"]),
    q("find-minimum-in-rotated-sorted-array", "medium", ["Binary Search"]),
    q("search-in-rotated-sorted-array", "medium", ["Binary Search"]),
    q("3sum", "medium", ["Two Pointers", "Array"]),
    q("container-with-most-water", "medium", ["Two Pointers"]),
    # Two pointers
    q("valid-palindrome", "easy", ["Two Pointers", "String"]),
    q("two-sum-ii-input-array-is-sorted", "medium", ["Two Pointers", "Binary Search"]),
    q("trapping-rain-water", "hard", ["Two Pointers", "Stack"]),
    # Sliding window
    q("longest-substring-without-repeating-characters", "medium", ["Sliding Window", "Hash Table"]),
    q("longest-repeating-character-replacement", "medium", ["Sliding Window"]),
    q("minimum-window-substring", "hard", ["Sliding Window", "String"]),
    q("valid-anagram", "easy", ["Hash Table", "String"]),
    q("group-anagrams", "medium", ["Hash Table", "String"]),
    # Stack
    q("valid-parentheses", "easy", ["Stack"]),
    q("min-stack", "medium", ["Stack", "Design"]),
    q("evaluate-reverse-polish-notation", "medium", ["Stack"]),
    q("generate-parentheses", "medium", ["Backtracking"]),
    q("daily-temperatures", "medium", ["Stack", "Monotonic Stack"]),
    q("car-fleet", "medium", ["Stack"]),
    q("largest-rectangle-in-histogram", "hard", ["Stack", "Monotonic Stack"]),
    # Binary search
    q("binary-search", "easy", ["Binary Search"]),
    q("search-a-2d-matrix", "medium", ["Binary Search", "Matrix"]),
    q("koko-eating-bananas", "medium", ["Binary Search"]),
    q("find-minimum-in-rotated-sorted-array-ii", "hard", ["Binary Search"]),
    q("time-based-key-value-store", "medium", ["Binary Search", "Design"]),
    q("median-of-two-sorted-arrays", "hard", ["Binary Search"]),
    # Linked list
    q("reverse-linked-list", "easy", ["Linked List"]),
    q("linked-list-cycle", "easy", ["Linked List", "Two Pointers"]),
    q("merge-two-sorted-lists", "easy", ["Linked List"]),
    q("merge-k-sorted-lists", "hard", ["Linked List", "Heap"]),
    q("remove-nth-node-from-end-of-list", "medium", ["Linked List", "Two Pointers"]),
    q("reorder-list", "medium", ["Linked List"]),
    # Trees
    q("invert-binary-tree", "easy", ["Tree", "DFS"]),
    q("maximum-depth-of-binary-tree", "easy", ["Tree", "DFS"]),
    q("diameter-of-binary-tree", "easy", ["Tree", "DFS"]),
    q("balanced-binary-tree", "easy", ["Tree", "DFS"]),
    q("same-tree", "easy", ["Tree", "DFS"]),
    q("subtree-of-another-tree", "easy", ["Tree", "DFS"]),
    q("lowest-common-ancestor-of-a-binary-search-tree", "medium", ["Tree", "BST"]),
    q("binary-tree-level-order-traversal", "medium", ["Tree", "BFS"]),
    q("binary-tree-right-side-view", "medium", ["Tree", "BFS"]),
    q("count-good-nodes-in-binary-tree", "medium", ["Tree", "DFS"]),
    q("validate-binary-search-tree", "medium", ["Tree", "BST"]),
    q("kth-smallest-element-in-a-bst", "medium", ["Tree", "BST"]),
    q("construct-binary-tree-from-preorder-and-inorder-traversal", "medium", ["Tree"]),
    q("binary-tree-maximum-path-sum", "hard", ["Tree", "DFS"]),
    q("serialize-and-deserialize-binary-tree", "hard", ["Tree", "Design"]),
    # Tries
    q("implement-trie-prefix-tree", "medium", ["Trie", "Design"]),
    q("design-add-and-search-words-data-structure", "medium", ["Trie", "Backtracking"]),
    q("word-search-ii", "hard", ["Trie", "Backtracking"]),
    # Heap
    q("kth-largest-element-in-a-stream", "easy", ["Heap"]),
    q("last-stone-weight", "easy", ["Heap"]),
    q("k-closest-points-to-origin", "medium", ["Heap", "Math"]),
    q("kth-largest-element-in-an-array", "medium", ["Heap", "Quickselect"]),
    q("task-scheduler", "medium", ["Heap", "Greedy"]),
    q("find-median-from-data-stream", "hard", ["Heap", "Design"]),
    # Backtracking
    q("subsets", "medium", ["Backtracking"]),
    q("combination-sum", "medium", ["Backtracking"]),
    q("word-search", "medium", ["Backtracking", "Matrix"]),
    q("n-queens", "hard", ["Backtracking"]),
    # Graphs
    q("number-of-islands", "medium", ["Graph", "DFS"]),
    q("clone-graph", "medium", ["Graph", "BFS"]),
    q("max-area-of-island", "medium", ["Graph", "DFS"]),
    q("pacific-atlantic-water-flow", "medium", ["Graph"]),
    q("course-schedule", "medium", ["Graph", "Topological Sort"]),
    q("number-of-connected-components-in-an-undirected-graph", "medium", ["Graph", "Union Find"]),
    q("graph-valid-tree", "medium", ["Graph", "Union Find"]),
    q("word-ladder", "hard", ["Graph", "BFS"]),
    # Advanced graphs
    q("alien-dictionary", "hard", ["Graph", "Topological Sort"]),
    # 1D DP
    q("climbing-stairs", "easy", ["DP"]),
    q("min-cost-climbing-stairs", "easy", ["DP"]),
    q("house-robber", "medium", ["DP"]),
    q("house-robber-ii", "medium", ["DP"]),
    q("longest-palindromic-substring", "medium", ["DP", "String"]),
    q("palindromic-substrings", "medium", ["DP", "String"]),
    q("decode-ways", "medium", ["DP"]),
    q("coin-change", "medium", ["DP"]),
    q("word-break", "medium", ["DP"]),
    q("longest-increasing-subsequence", "medium", ["DP"]),
    q("partition-equal-subset-sum", "medium", ["DP"]),
    # 2D DP
    q("unique-paths", "medium", ["DP", "Matrix"]),
    q("longest-common-subsequence", "medium", ["DP", "String"]),
    q("best-time-to-buy-and-sell-stock-with-cooldown", "medium", ["DP"]),
    q("coin-change-ii", "medium", ["DP"]),
    q("target-sum", "medium", ["DP"]),
    q("interleaving-string", "medium", ["DP"]),
    q("edit-distance", "medium", ["DP", "String"]),
    q("burst-balloons", "hard", ["DP"]),
    q("regular-expression-matching", "hard", ["DP", "String"]),
    # Greedy
    q("jump-game", "medium", ["Greedy"]),
    q("jump-game-ii", "medium", ["Greedy"]),
    q("gas-station", "medium", ["Greedy"]),
    q("hand-of-straights", "medium", ["Greedy", "Hash Table"]),
    q("merge-triplets-to-form-target-triplet", "medium", ["Greedy"]),
    q("partition-labels", "medium", ["Greedy"]),
    q("valid-parenthesis-string", "medium", ["Greedy", "Stack"]),
    # Intervals
    q("insert-interval", "medium", ["Intervals"]),
    q("merge-intervals", "medium", ["Intervals"]),
    q("non-overlapping-intervals", "medium", ["Intervals", "Greedy"]),
    q("meeting-rooms", "easy", ["Intervals"], "Meeting Rooms (Premium)"),
    q("meeting-rooms-ii", "medium", ["Intervals", "Heap"], "Meeting Rooms II (Premium)"),
    q("minimum-interval-to-include-each-query", "medium", ["Intervals"]),
    # Math & geometry
    q("rotate-image", "medium", ["Matrix"]),
    q("spiral-matrix", "medium", ["Matrix"]),
    q("set-matrix-zeroes", "medium", ["Matrix"]),
    q("happy-number", "easy", ["Math"]),
    q("plus-one", "easy", ["Math", "Array"]),
    q("pow-x-n", "medium", ["Math"]),
    q("multiply-strings", "medium", ["Math", "String"]),
    q("detect-squares", "medium", ["Math", "Design"]),
    # Bits
    q("single-number", "easy", ["Bit Manipulation"]),
    q("number-of-1-bits", "easy", ["Bit Manipulation"]),
    q("counting-bits", "easy", ["Bit Manipulation", "DP"]),
    q("reverse-bits", "easy", ["Bit Manipulation"]),
    q("missing-number", "easy", ["Bit Manipulation", "Hash Table"]),
    q("sum-of-two-integers", "medium", ["Bit Manipulation"]),
    q("reverse-integer", "medium", ["Math"]),
]

# NeetCode 150 = Blind-75 core + these extras (dedup by slug below)
NEETCODE_EXTRA = [
    q("valid-sudoku", "medium", ["Matrix", "Hash Table"]),
    q("top-k-frequent-elements", "medium", ["Hash Table", "Heap"]),
    q("encode-and-decode-strings", "medium", ["String", "Design"], "Encode & Decode Strings (Lintcode)"),
    q("longest-consecutive-sequence", "medium", ["Array", "Hash Table"]),
    q("valid-palindrome-ii", "easy", ["Two Pointers", "String"]),
    q("sort-colors", "medium", ["Two Pointers", "Sorting"]),
    q("longest-substring-with-at-most-k-distinct-characters", "medium", ["Sliding Window"]),
    q("minimum-size-subarray-sum", "medium", ["Sliding Window"]),
    q("minimum-stack", "medium", ["Stack"], "Min Stack (NeetCode alias)"),
    q("baseball-game", "easy", ["Stack"]),
    q("next-greater-element-i", "easy", ["Stack", "Monotonic Stack"]),
    q("next-greater-element-ii", "medium", ["Stack", "Monotonic Stack"]),
    q("rotting-oranges", "medium", ["Graph", "BFS"]),
    q("walls-and-gates", "medium", ["Graph", "BFS"], "Walls and Gates (Premium)"),
    q("course-schedule-ii", "medium", ["Graph", "Topological Sort"]),
    q("redundant-connection", "medium", ["Graph", "Union Find"]),
    q("number-of-islands-ii", "medium", ["Graph", "Union Find"], "Number of Islands II (Premium)"),
    q("most-stones-removed-with-same-row-or-column", "medium", ["Graph", "Union Find"]),
    q("network-delay-time", "medium", ["Graph", "Shortest Path"]),
    q("cheapest-flights-within-k-stops", "medium", ["Graph", "Shortest Path"]),
    q("min-cost-to-connect-all-points", "medium", ["Graph", "MST"], "Min Cost to Connect All Points"),
    q("swim-in-rising-water", "hard", ["Graph", "Binary Search"]),
    q("foreign-dictionary", "hard", ["Graph", "Topological Sort"], "Alien Dictionary (variant)"),
    q("design-browser-history", "medium", ["Design", "Linked List"]),
    q("count-sorted-vowel-strings", "medium", ["DP"]),
    q("camelcase-matching", "medium", ["String", "Trie"]),
    q("insert-delete-getrandom-o1", "medium", ["Design", "Hash Table"]),
    q("design-hashmap", "easy", ["Design", "Hash Table"]),
    q("design-twitter", "medium", ["Design", "Heap"]),
    q("account-merge", "medium", ["Union Find"], "Accounts Merge"),
    q("string-to-integer-atoi", "medium", ["String", "Math"]),
    q("zigzag-conversion", "medium", ["String"]),
    q("find-the-index-of-the-first-occurrence-in-a-string", "easy", ["String"]),
    q("shortest-palindrome", "hard", ["String"], "Shortest Palindrome"),
    q("letter-combinations-of-a-phone-number", "medium", ["Backtracking"]),
    q("combinations", "medium", ["Backtracking"]),
    q("permutations", "medium", ["Backtracking"]),
    q("subsets-ii", "medium", ["Backtracking"]),
    q("combination-sum-ii", "medium", ["Backtracking"]),
    q("palindrome-partitioning", "medium", ["Backtracking"]),
    q("pairs-of-songs-with-total-durations-divisible-by-60", "medium", ["Array", "Math"]),
    q("rotate-array", "medium", ["Array"], "Rotate Array"),
    q("boats-to-save-people", "medium", ["Two Pointers", "Greedy"]),
    q("two-city-scheduling", "medium", ["Greedy"]),
]

# Striver A2Z / SDE sheet — curated 45-problem starter subset
STRIVER = [
    q("sort-colors", "medium", ["Arrays", "Sorting"], "Sort 0s, 1s and 2s"),
    q("majority-element", "easy", ["Arrays", "Hash Table"], "Majority Element (>N/2)"),
    q("maximum-subarray", "medium", ["Arrays", "DP"], "Maximum Subarray (Kadane's)"),
    q("best-time-to-buy-and-sell-stock", "easy", ["Arrays", "Greedy"], "Stock Buy and Sell"),
    q("next-permutation", "medium", ["Arrays"], "Next Permutation"),
    q("pascals-triangle", "easy", ["Arrays"], "Pascal's Triangle"),
    q("merge-intervals", "medium", ["Intervals"], "Merge Overlapping Subintervals"),
    q("merge-sorted-array", "medium", ["Arrays", "Two Pointers"], "Merge Sorted Arrays In-Place"),
    q("find-the-duplicate-number", "medium", ["Arrays", "Math"], "Repeating and Missing Number"),
    q("count-inversions", "medium", ["Arrays", "Divide & Conquer"], "Count Inversions"),
    q("rotate-image", "medium", ["Matrix"], "Rotate Matrix 90°"),
    q("search-a-2d-matrix", "medium", ["Matrix", "Binary Search"], "Search in 2D Matrix"),
    q("majority-element-ii", "medium", ["Arrays"], "Majority Element (>N/3)"),
    q("two-sum", "easy", ["Arrays", "Hash Table"], "Two Sum (check pair)"),
    q("4sum", "hard", ["Arrays", "Two Pointers"], "4-Sum"),
    q("longest-consecutive-sequence", "hard", ["Arrays", "Hash Table"], "Longest Consecutive Sequence"),
    q("longest-substring-without-repeating-characters", "medium", ["Strings", "Sliding Window"], "Longest Substring Without Repeats"),
    q("longest-palindromic-substring", "medium", ["Strings", "DP"], "Longest Palindromic Substring"),
    q("roman-to-integer", "easy", ["Strings", "Math"], "Roman ↔ Integer"),
    q("string-to-integer-atoi", "medium", ["Strings"], "Implement ATOI"),
    q("subarrays-with-k-different-integers", "medium", ["Strings", "Sliding Window"], "Count Substrings with K Distinct"),
    q("longest-common-prefix-striver", "easy", ["Strings"], "Longest Common Prefix"),
    q("reverse-words-in-a-string", "medium", ["Strings"], "Reverse Words in a String"),
    q("reverse-linked-list", "medium", ["Linked List"], "Reverse a LinkedList"),
    q("middle-of-linked-list", "easy", ["Linked List"], "Middle of LinkedList"),
    q("merge-two-sorted-lists", "easy", ["Linked List"], "Merge Two Sorted Lists"),
    q("remove-nth-node-from-end-of-list", "medium", ["Linked List"], "Remove Nth Node From End"),
    q("add-two-numbers", "medium", ["Linked List"], "Add Two Numbers"),
    q("delete-node-in-a-linked-list", "medium", ["Linked List"], "Delete Given Node"),
    q("intersection-of-two-linked-lists", "easy", ["Linked List"], "Intersection of Two Lists"),
    q("detect-a-cycle-in-a-linked-list", "easy", ["Linked List"], "Cycle Detection"),
    q("reverse-nodes-in-k-group", "hard", ["Linked List"], "Reverse in K-Groups"),
    q("sort-a-linked-list-of-0s-1s-and-2s", "medium", ["Linked List"], "Sort 0s/1s/2s List"),
    q("flatten-a-multilevel-doubly-linked-list", "hard", ["Linked List"], "Flatten a Multilevel List"),
    q("copy-list-with-random-pointer", "hard", ["Linked List"], "Clone with Random Pointer"),
    q("lru-cache", "medium", ["Design", "Linked List"], "LRU Cache"),
    q("lfu-cache", "hard", ["Design"], "LFU Cache"),
    q("binary-tree-inorder-traversal", "easy", ["Tree", "DFS"], "Inorder Traversal"),
    q("binary-tree-level-order-traversal", "medium", ["Tree", "BFS"], "Level Order Traversal"),
    q("maximum-depth-of-binary-tree", "easy", ["Tree", "DFS"], "Height / Max Depth"),
    q("balanced-binary-tree", "medium", ["Tree", "DFS"], "Balanced Binary Tree"),
    q("diameter-of-binary-tree", "easy", ["Tree", "DFS"], "Diameter of Binary Tree"),
    q("binary-tree-maximum-path-sum", "hard", ["Tree", "DFS"], "Maximum Path Sum"),
    q("same-tree", "easy", ["Tree", "DFS"], "Identical Trees"),
    q("binary-tree-zigzag-level-order-traversal", "medium", ["Tree", "BFS"], "Zigzag Traversal"),
]


def dedupe(items):
    seen, out = set(), []
    for it in items:
        if it["slug"] not in seen:
            seen.add(it["slug"])
            out.append(it)
    return out


def write(name, slug, display, description, source, questions):
    path = OUT / f"{slug}.json"
    path.write_text(json.dumps({
        "slug": slug, "name": display, "description": description,
        "source_url": source, "questions": questions,
    }, indent=1), encoding="utf-8")
    print(f"{path.name}: {len(questions)} questions")


write("blind75", "blind-75", "Blind 75",
      "The classic 75 must-know problems — the most famous interview prep list.",
      "https://leetcode.com/problem-list/oizxjoit/", BLIND75[:75])

write("neetcode150", "neetcode-150", "NeetCode 150",
      "Blind 75 expanded to 150 — original list by NeetCode, ordered by pattern.",
      "https://neetcode.io/practice", dedupe(BLIND75 + NEETCODE_EXTRA))

write("striver", "striver-sde", "Striver SDE (starter)",
      "Curated starter subset of takeuforward's SDE Sheet — arrays, strings, linked lists, trees.",
      "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/", STRIVER)

print("done")
