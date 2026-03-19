"""
Compatibility helpers for optional Strands tool decorators during local tests.
"""

from __future__ import annotations

try:
    from strands import tool
except ImportError:  # pragma: no cover - depends on local environment
    def tool(fn):
        return fn

