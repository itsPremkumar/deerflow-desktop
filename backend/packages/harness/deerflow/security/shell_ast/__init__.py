"""Defense-in-depth Shell AST security analyzer and confirmation policy."""

from deerflow.security.shell_ast.analyzer import (
    AnalysisReport,
    RiskLevel,
    SecurityViolation,
    ShellASTSecurityAnalyzer,
)
from deerflow.security.shell_ast.ast_nodes import (
    ASTNode,
    CommandNode,
    CompoundNode,
    NodeType,
    PipelineNode,
    RedirectionNode,
    SubshellNode,
)
from deerflow.security.shell_ast.parser import ShellASTParser
from deerflow.security.shell_ast.policy import (
    ConfirmationPolicy,
    ExecutionDecision,
    PolicyEvaluationResult,
    ShellSecurityException,
)

__all__ = [
    "ASTNode",
    "NodeType",
    "CommandNode",
    "PipelineNode",
    "SubshellNode",
    "CompoundNode",
    "RedirectionNode",
    "ShellASTParser",
    "RiskLevel",
    "SecurityViolation",
    "AnalysisReport",
    "ShellASTSecurityAnalyzer",
    "ExecutionDecision",
    "PolicyEvaluationResult",
    "ConfirmationPolicy",
    "ShellSecurityException",
]
