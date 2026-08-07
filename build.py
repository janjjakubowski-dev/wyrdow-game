#!/usr/bin/env python3
"""Wyrdów build — assembles src/*.js into the single-file deliverable.

The game bible mandates a single index.html for players; development
happens in src/ modules. This script is the only thing that should
ever write index.html.

Usage:  python3 build.py          build + syntax-check
        python3 build.py --check  verify index.html matches src/ (CI-style)
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
TEMPLATE = ROOT / "build" / "template.html"
OUT = ROOT / "index.html"

BANNER = (
    "// ═══════════════════════════════════════════════════════════════════\n"
    "//  GENERATED FILE — DO NOT EDIT index.html DIRECTLY.\n"
    "//  Source lives in src/*.js — edit there, then run: python3 build.py\n"
    "// ═══════════════════════════════════════════════════════════════════\n"
)


def assemble() -> str:
    modules = sorted(SRC.glob("*.js"))
    if not modules:
        sys.exit("build: no modules in src/")
    script = "".join(m.read_text() for m in modules)
    template = TEMPLATE.read_text()
    if "@@GAME@@" not in template:
        sys.exit("build: template missing @@GAME@@ placeholder")
    print(f"build: {len(modules)} modules, {len(script):,} chars")
    return template.replace("@@GAME@@", BANNER + script)


def syntax_check(html: str) -> None:
    """Parse every inline script through JavaScriptCore (no node needed)."""
    jxa = r'''
ObjC.import("Foundation");
const c = $.NSString.stringWithContentsOfFileEncodingError(
  "%s", $.NSUTF8StringEncoding, null).js;
const re = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;
let m, bad = [];
while ((m = re.exec(c)) !== null) {
  try { new Function(m[1]); } catch (e) { bad.push(e.message); }
}
bad.length ? "FAIL: " + bad.join(" | ") : "OK";
''' % OUT
    out = subprocess.run(
        ["osascript", "-l", "JavaScript", "-e", jxa],
        capture_output=True, text=True,
    ).stdout.strip()
    if out != "OK":
        sys.exit(f"build: syntax check failed — {out}")
    print("build: syntax OK (JavaScriptCore)")


def main() -> None:
    html = assemble()
    if "--check" in sys.argv:
        if OUT.read_text() != html:
            sys.exit("check: index.html is OUT OF DATE — run python3 build.py")
        print("check: index.html matches src/")
        return
    OUT.write_text(html)
    syntax_check(html)
    print(f"build: wrote {OUT.name} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
