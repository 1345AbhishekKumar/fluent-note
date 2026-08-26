#!/usr/bin/env python3
"""
spacing_audit.py

Scans a frontend codebase (CSS/SCSS/Tailwind/JSX/TSX) for:
  1. px spacing/sizing values that aren't multiples of 4 (violates 8pt/4pt grid)
  2. Tailwind arbitrary-value spacing/sizing (e.g. p-[13px], w-[43px]) — these
     bypass the design system's spacing scale by construction
  3. Interactive elements whose height/width (from inline style or a plain
     CSS rule) fall below common touch-target minimums (44px mobile, 24px
     WCAG 2.2 AA floor)

It also does a project-wide check for `prefers-reduced-motion` handling:
if the codebase contains animation code (CSS transitions/keyframes, or
Framer Motion / GSAP usage) but no `prefers-reduced-motion` query anywhere,
that's flagged as a project-level Critical finding — treat it the same way
you'd treat a WCAG violation, since functionally it is one.

This is a heuristic scanner, not a full CSS engine — it doesn't resolve
computed styles, CSS variables, or cascade order. Treat every hit as a
candidate for manual review, not an automatic finding. It is meant to save
an auditor from manually grepping a whole codebase, not to replace judgment
about whether a given value is actually a problem (e.g., a deliberate 1px
border is not a spacing violation).

Usage:
    python3 spacing_audit.py <path-to-project> [--ext .css,.scss,.tsx,.jsx]
"""

import argparse
import os
import re
import sys
from collections import defaultdict

DEFAULT_EXTENSIONS = {".css", ".scss", ".less", ".tsx", ".jsx", ".ts", ".js", ".html"}

# CSS properties where spacing-grid rules apply
SPACING_PROPS = r"(margin|padding|gap|top|left|right|bottom|width|height|row-gap|column-gap)"

# e.g. "margin-left: 13px;" or "padding: 8px 13px;"
CSS_PX_RE = re.compile(
    rf"(?P<prop>{SPACING_PROPS}(-\w+)?)\s*:\s*(?P<values>[^;{{}}]+)px",
    re.IGNORECASE,
)

# Grabs all px numbers within a matched value chunk (handles shorthand: "8px 13px 0 4px")
PX_NUM_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s*px")

# Tailwind arbitrary value spacing/sizing utilities: p-[13px], gap-[22px], w-[43px], h-[7px], etc.
TW_ARBITRARY_RE = re.compile(
    r"\b(?:m|mt|mb|ml|mr|mx|my|p|pt|pb|pl|pr|px|py|gap|gap-x|gap-y|w|h|min-w|min-h|max-w|max-h|top|left|right|bottom|inset)"
    r"-\[(-?\d+(?:\.\d+)?)(px)?\]"
)

# Standard Tailwind spacing scale is 4px per step (1 = 0.25rem = 4px), so numeric
# Tailwind classes without brackets (p-3, gap-2, w-10) are already grid-safe and
# don't need scanning — only arbitrary bracket values escape the scale.

# Rough detector for interactive elements with explicit sizing, to flag touch targets
INTERACTIVE_TAG_RE = re.compile(
    r"<(button|a|input)\b[^>]*?(?:style=\"[^\"]*?(?:height|width)\s*:\s*(\d+)px[^\"]*\")?[^>]*>",
    re.IGNORECASE,
)

# Signals that animation code exists at all, so a missing reduced-motion
# query is worth flagging (no point flagging it on a fully static site)
ANIMATION_SIGNAL_RE = re.compile(
    r"(@keyframes|transition\s*:|animate\(|framer-motion|from\s+[\"']framer-motion[\"']|gsap|Animated\.|useAnimation)",
    re.IGNORECASE,
)

REDUCED_MOTION_RE = re.compile(r"prefers-reduced-motion", re.IGNORECASE)


def is_grid_safe(value: float, base: int = 4) -> bool:
    return abs(value) % base == 0


def scan_file(path):
    findings = []
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    except OSError:
        return findings

    lines = text.splitlines()

    # 1. Plain CSS px values on spacing/sizing properties
    for match in CSS_PX_RE.finditer(text):
        prop = match.group("prop")
        values_chunk = match.group("values") + "px"
        line_no = text[: match.start()].count("\n") + 1
        for num_match in PX_NUM_RE.finditer(values_chunk):
            val = float(num_match.group(1))
            if val == 0:
                continue
            if not is_grid_safe(val):
                findings.append(
                    {
                        "line": line_no,
                        "type": "off-grid-px",
                        "detail": f"{prop}: {val}px is not a multiple of 4",
                        "snippet": lines[line_no - 1].strip() if line_no <= len(lines) else "",
                    }
                )

    # 2. Tailwind arbitrary spacing/sizing values
    for match in TW_ARBITRARY_RE.finditer(text):
        raw = match.group(0)
        val_str = match.group(1)
        line_no = text[: match.start()].count("\n") + 1
        try:
            val = float(val_str)
        except ValueError:
            continue
        findings.append(
            {
                "line": line_no,
                "type": "tailwind-arbitrary",
                "detail": f"Arbitrary value '{raw}' bypasses the Tailwind spacing scale"
                + ("" if is_grid_safe(val) else f" and is not a multiple of 4 ({val})"),
                "snippet": lines[line_no - 1].strip() if line_no <= len(lines) else "",
            }
        )

    # 3. Interactive elements with small explicit sizing
    for match in INTERACTIVE_TAG_RE.finditer(text):
        size_val = match.group(2)
        if size_val is None:
            continue
        val = float(size_val)
        line_no = text[: match.start()].count("\n") + 1
        if val < 24:
            severity = "Critical (below WCAG 2.2 AA 24px floor)"
        elif val < 44:
            severity = "Major (below 44px mobile touch-target recommendation)"
        else:
            continue
        findings.append(
            {
                "line": line_no,
                "type": "touch-target",
                "detail": f"Interactive element sized {val}px — {severity}",
                "snippet": lines[line_no - 1].strip() if line_no <= len(lines) else "",
            }
        )

    return findings


def main():
    parser = argparse.ArgumentParser(description="Audit a codebase for spacing/sizing grid and touch-target issues.")
    parser.add_argument("path", help="Path to project root or a single file")
    parser.add_argument(
        "--ext",
        default=",".join(sorted(DEFAULT_EXTENSIONS)),
        help="Comma-separated list of extensions to scan (default covers css/scss/less/tsx/jsx/ts/js/html)",
    )
    parser.add_argument(
        "--ignore",
        default="node_modules,.next,dist,build,.git",
        help="Comma-separated directory names to skip",
    )
    args = parser.parse_args()

    extensions = {e if e.startswith(".") else f".{e}" for e in args.ext.split(",")}
    ignore_dirs = set(args.ignore.split(","))

    target = args.path
    files_to_scan = []

    if os.path.isfile(target):
        files_to_scan = [target]
    elif os.path.isdir(target):
        for root, dirs, files in os.walk(target):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for fname in files:
                if os.path.splitext(fname)[1] in extensions:
                    files_to_scan.append(os.path.join(root, fname))
    else:
        print(f"Path not found: {target}", file=sys.stderr)
        sys.exit(1)

    all_findings = defaultdict(list)
    total = 0
    has_animation_code = False
    has_reduced_motion = False

    for fpath in files_to_scan:
        findings = scan_file(fpath)
        if findings:
            all_findings[fpath] = findings
            total += len(findings)

        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except OSError:
            continue
        if ANIMATION_SIGNAL_RE.search(content):
            has_animation_code = True
        if REDUCED_MOTION_RE.search(content):
            has_reduced_motion = True

    if has_animation_code and not has_reduced_motion:
        print(
            "⚠️  PROJECT-LEVEL FINDING [Critical]: animation code detected "
            "(keyframes/transitions/Framer Motion/GSAP) but no `prefers-reduced-motion` "
            "handling found anywhere in the scanned files. Treat as an accessibility "
            "violation, not a style nitpick.\n"
        )

    if total == 0:
        if not (has_animation_code and not has_reduced_motion):
            print("No grid/touch-target issues detected by the scanner.")
            print("(This checks numeric violations only — still do a manual pass for anything the regex can't see.)")
        return

    print(f"Found {total} candidate issue(s) across {len(all_findings)} file(s):\n")
    for fpath, findings in sorted(all_findings.items()):
        rel = os.path.relpath(fpath, target if os.path.isdir(target) else os.path.dirname(target))
        print(f"## {rel}")
        for f in findings:
            print(f"  L{f['line']} [{f['type']}] {f['detail']}")
            if f["snippet"]:
                print(f"      {f['snippet']}")
        print()


if __name__ == "__main__":
    main()
