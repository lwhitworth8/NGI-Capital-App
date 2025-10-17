"""
NGI Capital Models Package (Compatibility Shim)
This package re-exports all symbols from the legacy single-file models module
at `src/api/models.py` so existing imports like `from services.api import models`
and `from services.api.models import Partners` continue to work.
"""

from __future__ import annotations

import os
import sys
import importlib.util
from types import ModuleType
from typing import List

_here = os.path.dirname(__file__)
_file_module_path = os.path.abspath(os.path.join(_here, os.pardir, 'models.py'))

_mod: ModuleType | None = None
try:
    spec = importlib.util.spec_from_file_location('services.api._models_single', _file_module_path)
    if spec and spec.loader:
        _mod = importlib.util.module_from_spec(spec)
        sys.modules['services.api._models_single'] = _mod
        spec.loader.exec_module(_mod)
except Exception:
    _mod = None

if _mod is None:
    # Fallback: define minimal sentinel to fail clearly on access
    raise ImportError(f"Failed to load legacy models module at {_file_module_path}")

# Re-export public attributes from the loaded module
_public: List[str] = []
for _name in dir(_mod):
    if _name.startswith('_'):
        continue
    _public.append(_name)
    globals()[_name] = getattr(_mod, _name)

__all__ = _public

