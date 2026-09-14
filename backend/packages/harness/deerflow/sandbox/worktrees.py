"""Managed Git Worktree Isolation for subagents inspired by OpenClaw."""

from __future__ import annotations

import contextlib
import logging
import shutil
import subprocess
import time
from collections.abc import Generator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class WorktreeInstance:
    path: Path
    branch_name: str
    is_active: bool = True
    created_at: float = field(default_factory=time.time)


class WorktreeManager:
    """Provisions and prunes isolated git worktrees for parallel agent execution."""

    def __init__(self, repo_root: Path | str, base_worktree_dir: Path | str | None = None):
        self.repo_root = Path(repo_root).resolve()
        if base_worktree_dir:
            self.worktrees_dir = Path(base_worktree_dir).resolve()
        else:
            self.worktrees_dir = self.repo_root / ".worktrees"
        self._active_worktrees: dict[str, WorktreeInstance] = {}

    def _run_git(self, args: list[str]) -> subprocess.CompletedProcess[str]:
        cmd = ["git", "-C", str(self.repo_root)] + args
        return subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )

    def create_worktree(self, branch_name: str, base_ref: str = "HEAD") -> WorktreeInstance:
        """Create an isolated worktree checked out to `branch_name`."""
        target_path = self.worktrees_dir / branch_name
        self.worktrees_dir.mkdir(parents=True, exist_ok=True)

        if target_path.exists():
            # If directory exists, verify git worktree status
            wt = WorktreeInstance(path=target_path, branch_name=branch_name)
            self._active_worktrees[branch_name] = wt
            return wt

        # Try git worktree add with a new branch
        proc = self._run_git(["worktree", "add", "-b", branch_name, str(target_path), base_ref])
        if proc.returncode != 0:
            # Branch might already exist, try checking out existing branch
            proc2 = self._run_git(["worktree", "add", str(target_path), branch_name])
            if proc2.returncode != 0:
                # Fallback for environments without git repository (e.g. mock or plain directory)
                target_path.mkdir(parents=True, exist_ok=True)
                logger.warning(
                    f"Git worktree add failed ({proc.stderr.strip()}). Created fallback directory: {target_path}"
                )

        wt = WorktreeInstance(path=target_path, branch_name=branch_name)
        self._active_worktrees[branch_name] = wt
        return wt

    def remove_worktree(
        self,
        branch_name: str,
        force: bool = True,
        delete_branch: bool = False,
    ) -> bool:
        """Prune and clean up a worktree."""
        target_path = self.worktrees_dir / branch_name

        # 1. Git worktree remove
        if target_path.exists():
            args = ["worktree", "remove", str(target_path)]
            if force:
                args.append("--force")
            self._run_git(args)

        # 2. Filesystem fallback cleanup if still present
        if target_path.exists():
            shutil.rmtree(target_path, ignore_errors=True)

        # 3. Optionally delete branch
        if delete_branch:
            self._run_git(["branch", "-D", branch_name])

        if branch_name in self._active_worktrees:
            self._active_worktrees[branch_name].is_active = False
            del self._active_worktrees[branch_name]

        return not target_path.exists()

    def list_worktrees(self) -> list[dict[str, Any]]:
        """List active worktrees."""
        proc = self._run_git(["worktree", "list", "--porcelain"])
        if proc.returncode == 0 and proc.stdout.strip():
            # Parse git output
            results = []
            current: dict[str, Any] = {}
            for line in proc.stdout.splitlines():
                if line.startswith("worktree "):
                    if current:
                        results.append(current)
                    current = {"path": line.split(" ", 1)[1]}
                elif line.startswith("branch "):
                    current["branch"] = line.split(" ", 1)[1]
                elif line.startswith("HEAD "):
                    current["head"] = line.split(" ", 1)[1]
            if current:
                results.append(current)
            return results

        # Fallback to in-memory tracking
        return [
            {"path": str(wt.path), "branch": wt.branch_name, "is_active": wt.is_active}
            for wt in self._active_worktrees.values()
        ]

    @contextlib.contextmanager
    def worktree_context(
        self,
        branch_name: str,
        base_ref: str = "HEAD",
        delete_on_exit: bool = True,
    ) -> Generator[WorktreeInstance, None, None]:
        """Context manager provisioning a worktree for isolated block execution."""
        wt = self.create_worktree(branch_name, base_ref=base_ref)
        try:
            yield wt
        finally:
            if delete_on_exit:
                self.remove_worktree(branch_name, force=True)
