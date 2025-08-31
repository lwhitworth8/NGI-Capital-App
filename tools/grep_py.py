import sys, re, pathlib
path = pathlib.Path(sys.argv[1])
pattern = re.compile(sys.argv[2])
for i, line in enumerate(path.read_text(encoding='utf-8', errors='ignore').splitlines(), 1):
    if pattern.search(line):
        print(f"{i}:{line}")
