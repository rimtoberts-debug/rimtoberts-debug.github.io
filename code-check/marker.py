import ast, builtins, contextlib, copy, io, json, traceback


def banned_hits(code, banned):
    """Return (hits, syntax_error). Each hit: {line, name}. Matches calls to a banned name and any banned attribute (e.g. a.sort)."""
    banned = set(banned or [])
    try:
        tree = ast.parse(code, "<student>")
    except SyntaxError as e:
        return [], {"line": e.lineno, "msg": "SyntaxError: " + str(e.msg)}
    hits = []
    for node in ast.walk(tree):
        name = None
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in banned:
            name = node.func.id
        elif isinstance(node, ast.Attribute) and node.attr in banned:
            name = node.attr
        if name:
            hits.append({"line": node.lineno, "name": name})
    hits.sort(key=lambda h: (h["line"], h["name"]))
    return hits, None


def _err(e):
    line = None
    for fr in traceback.extract_tb(e.__traceback__):
        if fr.filename == "<student>":
            line = fr.lineno
    if isinstance(e, SyntaxError):
        line = e.lineno
    return {"type": type(e).__name__, "msg": str(e), "line": line}


def _load(code, out):
    ns = {"__name__": "__student__", "__builtins__": builtins}
    with contextlib.redirect_stdout(out):
        exec(compile(code, "<student>", "exec"), ns)
    return ns


def run(code, banned=None):
    out = io.StringIO()
    res = {"stdout": "", "error": None}
    try:
        _load(code, out)
    except Exception as e:
        res["error"] = _err(e)
    res["stdout"] = out.getvalue()
    hits, _ = banned_hits(code, banned)
    res["banned"] = hits
    return res


def mark(code, fn, tests, banned=None):
    hits, syn = banned_hits(code, banned)
    res = {"banned": hits, "tests": [], "total": 0,
           "max": sum(t.get("marks", 1) for t in tests), "error": None, "stdout": ""}
    if syn:
        res["error"] = {"type": "SyntaxError", "msg": syn["msg"], "line": syn["line"]}
        return res
    out = io.StringIO()
    try:
        ns = _load(code, out)
        f = ns.get(fn)
        if not callable(f):
            raise NameError("Function '%s' is not defined" % fn)
    except Exception as e:
        res["error"] = _err(e)
        res["stdout"] = out.getvalue()
        return res
    for t in tests:
        marks = t.get("marks", 1)
        r = {"args": t["args"], "expected": t["expected"], "marks": marks,
             "got": None, "pass": False, "error": None}
        try:
            with contextlib.redirect_stdout(out):
                got = f(*copy.deepcopy(t["args"]))
            json.dumps(got)
            r["got"] = got
            r["pass"] = got == t["expected"] and type(got) == type(t["expected"])
        except Exception as e:
            r["error"] = _err(e)
        if hits:  # banned built-in used: no marks
            r["pass"] = False
        r["awarded"] = marks if r["pass"] else 0
        res["total"] += r["awarded"]
        res["tests"].append(r)
    res["stdout"] = out.getvalue()
    return res


def handle(msg_json):
    m = json.loads(msg_json)
    if m["type"] == "run":
        out = run(m["code"], m.get("banned"))
    else:
        out = mark(m["code"], m["function"], m["tests"], m.get("banned"))
    return json.dumps(out, default=repr)
