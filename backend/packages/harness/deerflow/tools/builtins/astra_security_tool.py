"""Legacy backward-compatibility shim for enterprise_security_tool.py."""

from __future__ import annotations

from .enclave_security_tool import astra_security_manage, enterprise_security_manage

__all__ = ["enterprise_security_manage", "astra_security_manage"]
