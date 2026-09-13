from pathlib import Path
import pytest
from deerflow.sandbox.worktrees import WorktreeManager


def test_worktree_lifecycle_fallback(tmp_path: Path):
    manager = WorktreeManager(repo_root=tmp_path)

    # 1. Create worktree
    wt = manager.create_worktree("agent-task-01")
    assert wt.path.exists()
    assert wt.branch_name == "agent-task-01"
    assert wt.is_active is True

    # 2. List worktrees
    wt_list = manager.list_worktrees()
    assert len(wt_list) >= 1
    assert any(w.get("branch") == "agent-task-01" for w in wt_list)

    # 3. Remove worktree
    removed = manager.remove_worktree("agent-task-01", force=True)
    assert removed is True
    assert not wt.path.exists()


def test_worktree_context_manager(tmp_path: Path):
    manager = WorktreeManager(repo_root=tmp_path)
    branch = "agent-subtask-auto"

    with manager.worktree_context(branch) as wt:
        assert wt.path.exists()
        test_file = wt.path / "output.txt"
        test_file.write_text("subagent work complete", encoding="utf-8")
        assert test_file.exists()

    # After exit, worktree should be cleaned up
    assert not wt.path.exists()
    assert branch not in manager._active_worktrees
