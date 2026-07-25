import os, re, json, pathlib

root = pathlib.Path(".")
src = root / "src"

# collect all source modules
modules = {}
for p in src.rglob("*"):
    if p.suffix in (".ts", ".tsx") and p.is_file():
        modules[str(p)] = p.read_text(errors="ignore")

# entry points: any page.tsx, layout.tsx, route.ts, middleware.ts
entries = [m for m in modules if re.search(r"(page|layout|route|middleware|not-found|error)\.tsx?$", m)]

# build import graph
def resolve(imp, frm):
    if imp.startswith("@/"):
        base = str(src / imp[2:])
    elif imp.startswith("."):
        base = str((pathlib.Path(frm).parent / imp).resolve().relative_to(pathlib.Path.cwd()))
    else:
        return None
    for ext in (".ts", ".tsx", "/index.ts", "/index.tsx"):
        if base + ext in modules: return base + ext
    if base in modules: return base
    return None

graph = {}
for m, content in modules.items():
    imps = (re.findall(r'from\s+["\']([^"\']+)["\']', content)
            + re.findall(r'import\(\s*["\']([^"\']+)["\']', content))
    graph[m] = [r for i in imps if (r := resolve(i, m))]

# BFS from entries
reached = set()
queue = list(entries)
while queue:
    cur = queue.pop()
    if cur in reached: continue
    reached.add(cur)
    queue.extend(graph.get(cur, []))

orphans = sorted(set(modules) - reached)
print("=== ORPHANED MODULES (nothing imports them) ===")
for o in orphans: print("  ", o)
print(f"\n  {len(modules)} modules, {len(reached)} reachable, {len(orphans)} orphaned")
