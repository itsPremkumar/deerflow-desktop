"""Built-in cognitive_compiler tool inspired by hermes-agi-asi-harness."""

from __future__ import annotations

import json
from langchain.tools import tool

from deerflow.planning.compiler import CognitiveCompiler


@tool("compile_cognitive_plan", parse_docstring=True)
def compile_cognitive_plan(
    goal: str,
    risk_tier: str = "R1",
    task_dag_json: str = "",
) -> str:
    """Compile a mission using the P0-P21 Cognitive Compiler.

    Generates competing Strategy Candidates (A/B/C) with trade-off scoring,
    topological parallel execution waves, and pre-computed recovery fallback trees.

    Args:
        goal: The mission objective to compile.
        risk_tier: The risk tier classification (R0 to R6).
        task_dag_json: Optional JSON string mapping task_id to list of dependency task_ids.
    """
    dag = None
    if task_dag_json:
        try:
            dag = json.loads(task_dag_json)
        except Exception:
            pass

    compiler = CognitiveCompiler()
    ir = compiler.compile(goal=goal, task_dag=dag, risk_tier=risk_tier)

    return json.dumps(ir.to_dict(), indent=2)
