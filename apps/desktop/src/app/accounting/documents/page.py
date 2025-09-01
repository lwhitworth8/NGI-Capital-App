"""
Stub module to support Python-side tests that patch this path:
  'apps.desktop.src.app.accounting.documents.page.fetch'

This file is not used by Next.js runtime. It only provides a 'fetch'
attribute so unittest.mock.patch can resolve the target during tests.
"""

def fetch(*args, **kwargs):  # type: ignore
    raise NotImplementedError("This is a stub for test patching; not executed.")

