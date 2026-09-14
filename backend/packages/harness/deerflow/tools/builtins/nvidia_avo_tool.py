"""Built-in NVIDIA Agentic Variation Operators (AVO) tool.
Implements frontier long-horizon evolutionary search Vary(P_t) = Agent(P_t, K, f).
"""

from __future__ import annotations

import json

from langchain.tools import tool

from deerflow.avo import (
    AVOEngine,
    EvaluationVector,
    VersionRecord,
)

_NVIDIA_AVO_ENGINE = AVOEngine()


@tool("run_nvidia_avo_step", parse_docstring=True)
def run_nvidia_avo_step(
    action: str,
    hypothesis: str = "",
    modification: str = "",
    code_snippet: str = "",
    metrics_json: str = "{}",
    correctness: bool = True,
    query_text: str = "",
    parent_id: str | None = None,
) -> str:
    """Execute an NVIDIA Agentic Variation Operator (AVO) step.

    Supports multi-dimensional vector evaluation, Pareto dominance tracking,
    domain knowledge base (K) queries, and supervisory plateau intervention.

    Args:
        action: Action to perform: 'vary' (execute variation step), 'inspect_frontier' (get Pareto optimal solutions), 'knowledge_query' (query K for patterns/anti-patterns), 'stats' (get engine statistics).
        hypothesis: Testable optimization hypothesis (e.g. 'Branchless accumulator rescaling').
        modification: Description of the code / algorithmic edit.
        code_snippet: Code implementation or diff.
        metrics_json: JSON string mapping configuration names to throughput/reward metrics (e.g. '{"seq_4096": 1250.0, "seq_8192": 1320.0}').
        correctness: Hard binary gate — if False, effective score is strictly zero.
        query_text: Query text for domain knowledge base lookup.
        parent_id: Optional parent version ID to branch from. Defaults to current head.
    """
    try:
        metrics = json.loads(metrics_json) if metrics_json else {}
    except Exception:
        metrics = {}

    if action == "knowledge_query":
        query = query_text or hypothesis
        entries = _NVIDIA_AVO_ENGINE.knowledge_base.query(query)
        return json.dumps({
            "query": query,
            "results": [e.to_dict() for e in entries],
        }, indent=2)

    elif action == "inspect_frontier":
        frontier = _NVIDIA_AVO_ENGINE.lineage.get_pareto_frontier()
        return json.dumps({
            "frontier_size": len(frontier),
            "versions": [v.to_dict() for v in frontier],
        }, indent=2)

    elif action == "stats":
        return json.dumps(_NVIDIA_AVO_ENGINE.stats(), indent=2)

    elif action == "vary":
        # Multi-dimensional vector evaluation
        vector = EvaluationVector(
            metrics=metrics,
            correctness=correctness,
            metadata={"code_snippet": code_snippet},
        )
        effective_parent = parent_id or _NVIDIA_AVO_ENGINE.lineage.head_id

        candidate = VersionRecord(
            parent_id=effective_parent,
            hypothesis=hypothesis,
            modification=modification,
            correctness=correctness,
            vector=vector,
            performance_score=vector.geometric_mean(),
            quality_score=1.0 if correctness else 0.0,
            diff_summary=modification,
            metadata={"code": code_snippet},
        )

        committed = _NVIDIA_AVO_ENGINE.lineage.commit_candidate(candidate)
        signature = f"{modification[:30]}_{correctness}"
        stagnated, directive, diag = _NVIDIA_AVO_ENGINE.supervisor.observe_step(
            improved=committed,
            signature=signature,
            backtrack_candidate=effective_parent,
        )

        if committed:
            _NVIDIA_AVO_ENGINE.knowledge_base.record_positive_pattern(
                hypothesis=hypothesis,
                modification_summary=modification,
                measured_gain=f"geomean={vector.geometric_mean()}",
            )
        else:
            _NVIDIA_AVO_ENGINE.knowledge_base.record_negative_lesson(
                attempt_hypothesis=hypothesis,
                failure_reason=candidate.rejection_reason or "Non-improving metrics",
            )

        return json.dumps({
            "version_id": candidate.version_id,
            "committed": committed,
            "correctness": correctness,
            "geometric_mean": vector.geometric_mean(),
            "metrics": vector.metrics,
            "current_head": _NVIDIA_AVO_ENGINE.lineage.head_id,
            "stagnation_detected": stagnated,
            "diagnostic": diag,
            "active_directive": directive.to_dict() if directive else None,
            "pareto_frontier_size": len(_NVIDIA_AVO_ENGINE.lineage.get_pareto_frontier()),
        }, indent=2)

    else:
        return json.dumps({
            "error": f"Unknown action '{action}'. Supported actions: 'vary', 'inspect_frontier', 'knowledge_query', 'stats'."
        }, indent=2)
