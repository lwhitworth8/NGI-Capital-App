import os, sys, importlib
print('CWD:', os.getcwd())
print('PATH0:', sys.path[0])
print('HAS_SRC_DIR:', os.path.isdir('src'))
print('HAS_INIT:', os.path.exists('src/__init__.py'))
try:
    mod = importlib.import_module('src.api.main')
    print('IMPORTED:', getattr(mod, '__file__', None))
except Exception as e:
    print('IMPORT ERROR:', repr(e))
