"""Tests for the review guard middleware."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from deerflow.agents.middlewares.review_guard_middleware import (
    ReviewGuardMiddleware,
    ReviewGuardMiddlewareState,
    _calculate_comment_ratio,
    _get_extension,
    _is_write_allowed,
    _resolve_role,
    _WRITE_TOOL_NAMES,
    build_review_guard_middleware,
)
from deerflow.config.review_guard_config import ReviewGuardConfig


class TestHelperFunctions:
    """Tests for helper functions."""

    def test_get_extension(self):
        assert _get_extension("/path/to/file.py") == ".py"
        assert _get_extension("file.ts") == ".ts"
        assert _get_extension("noext") == ""
        assert _get_extension(".hidden") == ""
        assert _get_extension("path.with.dots/file.tsx") == ".tsx"

    def test_calculate_comment_ratio_python(self):
        content = """# This is a comment
def foo():
    # Another comment
    return 42
"""
        ratio = _calculate_comment_ratio(content, ".py")
        assert 0.4 <= ratio <= 0.6  # 2 comments out of 4 non-empty lines

    def test_calculate_comment_ratio_no_comments(self):
        content = """def foo():
    return 42
"""
        ratio = _calculate_comment_ratio(content, ".py")
        assert ratio == 0.0

    def test_calculate_comment_ratio_all_comments(self):
        content = """# Comment 1
# Comment 2
"""
        ratio = _calculate_comment_ratio(content, ".py")
        assert ratio == 1.0

    def test_calculate_comment_ratio_unknown_extension(self):
        content = "no comments here"
        ratio = _calculate_comment_ratio(content, ".xyz")
        assert ratio == 1.0  # No enforcement for unknown extensions

    def test_is_write_allowed(self):
        policy = {
            "planner": [".md", ".txt"],
            "coder": [".py", ".ts"],
            "reviewer": [],
        }
        assert _is_write_allowed("planner", ".md", policy) is True
        assert _is_write_allowed("planner", ".py", policy) is False
        assert _is_write_allowed("coder", ".py", policy) is True
        assert _is_write_allowed("coder", ".md", policy) is False
        assert _is_write_allowed("reviewer", ".py", policy) is False
        assert _is_write_allowed("unknown", ".py", policy) is False

    def test_resolve_role_from_context(self):
        runtime = MagicMock()
        runtime.context = {"review_role": "planner"}
        assert _resolve_role(runtime, "coder") == "planner"

    def test_resolve_role_from_principal(self):
        runtime = MagicMock()
        principal = MagicMock()
        principal.role = "coder"
        runtime.context = {"principal": principal}
        assert _resolve_role(runtime, "default") == "coder"

    def test_resolve_role_default(self):
        runtime = MagicMock()
        runtime.context = {}
        assert _resolve_role(runtime, "coder") == "coder"

    def test_write_tool_names(self):
        assert "write_file" in _WRITE_TOOL_NAMES
        assert "str_replace" in _WRITE_TOOL_NAMES
        assert "read_file" not in _WRITE_TOOL_NAMES
        assert "bash" not in _WRITE_TOOL_NAMES


class TestReviewGuardConfig:
    """Tests for ReviewGuardConfig."""

    def test_defaults(self):
        cfg = ReviewGuardConfig()
        assert cfg.enabled is False
        assert cfg.min_comment_ratio == 0.15
        assert ".py" in cfg.enforce_on_extensions
        assert ".ts" in cfg.enforce_on_extensions
        assert cfg.default_role == "coder"
        assert "planner" in cfg.role_write_policy
        assert "coder" in cfg.role_write_policy

    def test_bounds(self):
        with pytest.raises(ValueError):
            ReviewGuardConfig(min_comment_ratio=1.5)
        with pytest.raises(ValueError):
            ReviewGuardConfig(min_comment_ratio=-0.1)


class TestReviewGuardMiddleware:
    """Tests for ReviewGuardMiddleware."""

    @pytest.fixture
    def config(self):
        return ReviewGuardConfig(
            enabled=True,
            min_comment_ratio=0.2,
            enforce_on_extensions=[".py", ".ts"],
            role_write_policy={
                "planner": [".md"],
                "coder": [".py", ".ts"],
                "reviewer": [],
            },
            default_role="coder",
        )

    @pytest.fixture
    def middleware(self, config):
        return ReviewGuardMiddleware(review_guard_config=config)

    @pytest.fixture
    def runtime(self):
        rt = MagicMock()
        rt.context = {"thread_id": "test-thread"}
        return rt

    @pytest.fixture
    def state(self):
        return ReviewGuardMiddlewareState()

    @pytest.mark.asyncio
    async def test_disabled_config_allows_all(self, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=ReviewGuardConfig(enabled=False))

        # Mock a write tool call
        request = MagicMock()
        request.tool_call = {"name": "write_file", "id": "call_1", "args": {"path": "test.py", "content": "x = 1"}}

        handler = AsyncMock()
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        handler.assert_called_once()
        # Should pass through without intervention

    @pytest.mark.asyncio
    async def test_non_write_tool_passes_through(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        request = MagicMock()
        request.tool_call = {"name": "read_file", "id": "call_1", "args": {"path": "test.py"}}

        handler = AsyncMock()
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_role_denied_write(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        request = MagicMock()
        request.tool_call = {"name": "write_file", "id": "call_1", "args": {"path": "test.py", "content": "x = 1"}}

        # Set role to planner who can only write .md
        runtime.context = {"thread_id": "test-thread", "review_role": "planner"}

        handler = AsyncMock()

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        handler.assert_not_called()
        assert result.status == "error"
        assert "not permitted to write .py files" in result.content

    @pytest.mark.asyncio
    async def test_role_allowed_write(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        request = MagicMock()
        request.tool_call = {"name": "write_file", "id": "call_1", "args": {"path": "test.py", "content": "x = 1\n# comment\n"}}

        # Set role to coder who can write .py
        runtime.context = {"thread_id": "test-thread", "review_role": "coder"}

        handler = AsyncMock()
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        handler.assert_called_once()
        assert result.status == "success"

    @pytest.mark.asyncio
    async def test_comment_density_enforcement(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        # Content with low comment ratio (1 comment, 4 non-empty lines = 0.25, but need >= 0.2)
        request = MagicMock()
        request.tool_call = {"name": "write_file", "id": "call_1", "args": {"path": "test.py", "content": "x = 1\ny = 2\nz = 3\n"}}

        runtime.context = {"thread_id": "test-thread", "review_role": "coder"}

        handler = AsyncMock()
        # Handler returns success with the new content
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        # Low comment density (0 comments / 3 non-empty = 0.0) should be rejected
        assert result.status == "error"
        assert "Comment density too low" in result.content

    @pytest.mark.asyncio
    async def test_comment_density_passes(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        # Content with sufficient comment ratio (2 comments / 3 non-empty = 0.67 >= 0.2)
        request = MagicMock()
        request.tool_call = {"name": "write_file", "id": "call_1", "args": {"path": "test.py", "content": "# comment\nx = 1\n# another\n"}}

        runtime.context = {"thread_id": "test-thread", "review_role": "coder"}

        handler = AsyncMock()
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        assert result.status == "success"

    @pytest.mark.asyncio
    async def test_str_replace_enforcement(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        request = MagicMock()
        request.tool_call = {"name": "str_replace", "id": "call_1", "args": {"path": "test.py", "old_str": "x = 1", "new_str": "y = 2\n# comment\n"}}

        runtime.context = {"thread_id": "test-thread", "review_role": "coder"}

        handler = AsyncMock()
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        assert result.status == "success"

    @pytest.mark.asyncio
    async def test_str_replace_low_density_rejected(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        request = MagicMock()
        request.tool_call = {"name": "str_replace", "id": "call_1", "args": {"path": "test.py", "old_str": "x = 1", "new_str": "y = 2\nz = 3\n"}}

        runtime.context = {"thread_id": "test-thread", "review_role": "coder"}

        handler = AsyncMock()
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        assert result.status == "error"
        assert "Comment density too low" in result.content

    @pytest.mark.asyncio
    async def test_extension_not_enforced(self, config, state, runtime):
        """Test that extensions not in enforce_on_extensions are not checked for comment density."""
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        # .md is not in enforce_on_extensions (only .py, .ts)
        request = MagicMock()
        request.tool_call = {"name": "write_file", "id": "call_1", "args": {"path": "test.md", "content": "no comments here"}}

        runtime.context = {"thread_id": "test-thread", "review_role": "coder"}

        handler = AsyncMock()
        handler.return_value = MagicMock(status="success")

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        # Should pass through without comment density check
        assert result.status == "success"

    @pytest.mark.asyncio
    async def test_reviewer_role_no_writes(self, config, state, runtime):
        middleware = ReviewGuardMiddleware(review_guard_config=config)

        request = MagicMock()
        request.tool_call = {"name": "write_file", "id": "call_1", "args": {"path": "test.py", "content": "x = 1\n# comment\n"}}

        runtime.context = {"thread_id": "test-thread", "review_role": "reviewer"}

        handler = AsyncMock()

        with patch("deerflow.agents.middlewares.review_guard_middleware.get_config", return_value={"runtime": runtime}):
            result = await middleware.wrap_tool_call(request, handler)

        handler.assert_not_called()
        assert result.status == "error"
        assert "not permitted to write .py files" in result.content

    def test_release_policy_parameters(self, middleware):
        params = middleware.release_policy_parameters()
        assert params["review_guard_enabled"] is True
        assert params["review_guard_min_comment_ratio"] == 0.2
        assert ".py" in params["review_guard_enforce_extensions"]
        assert "planner" in params["review_guard_role_policy"]


class TestFactory:
    """Test the factory function."""

    def test_build_review_guard_middleware(self):
        mw = build_review_guard_middleware()
        assert isinstance(mw, ReviewGuardMiddleware)
        assert mw._config.enabled is False

    def test_build_with_custom_config(self):
        cfg = ReviewGuardConfig(enabled=True, min_comment_ratio=0.3)
        mw = build_review_guard_middleware(review_guard_config=cfg)
        assert mw._config.enabled is True
        assert mw._config.min_comment_ratio == 0.3