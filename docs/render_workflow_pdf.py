#!/usr/bin/env python3
"""Render docs/catalog-automation-workflow.md → HTML → PDF (Chrome headless)."""
from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "docs" / "catalog-automation-workflow.md"
HTML_OUT = ROOT / "docs" / "catalog-automation-workflow.html"
PDF_OUT = ROOT / "docs" / "catalog-automation-workflow.pdf"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def md_inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<a href="\2">\1</a>',
        text,
    )
    return text


def render_md(src: str) -> str:
    lines = src.splitlines()
    out: list[str] = []
    i = 0
    in_code = False
    code_lang = ""
    code_buf: list[str] = []
    in_table = False
    table_rows: list[list[str]] = []
    in_ul = False
    in_ol = False

    def close_lists() -> None:
        nonlocal in_ul, in_ol
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if in_ol:
            out.append("</ol>")
            in_ol = False

    def flush_table() -> None:
        nonlocal in_table, table_rows
        if not table_rows:
            in_table = False
            return
        out.append('<table>')
        for ri, row in enumerate(table_rows):
            tag = "th" if ri == 0 else "td"
            if ri == 1 and all(re.fullmatch(r":?-{3,}:?", c.strip()) for c in row):
                continue
            out.append("<tr>" + "".join(f"<{tag}>{md_inline(c.strip())}</{tag}>" for c in row) + "</tr>")
        out.append("</table>")
        table_rows = []
        in_table = False

    while i < len(lines):
        line = lines[i]

        if line.startswith("```"):
            close_lists()
            flush_table()
            if not in_code:
                in_code = True
                code_lang = line[3:].strip()
                code_buf = []
            else:
                cls = f' class="lang-{html.escape(code_lang)}"' if code_lang else ""
                body = html.escape("\n".join(code_buf))
                out.append(f"<pre><code{cls}>{body}</code></pre>")
                in_code = False
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        if line.strip().startswith("|") and line.strip().endswith("|"):
            close_lists()
            cells = [c for c in line.strip().strip("|").split("|")]
            if not in_table:
                in_table = True
                table_rows = []
            table_rows.append(cells)
            i += 1
            continue
        else:
            flush_table()

        if not line.strip():
            close_lists()
            i += 1
            continue

        if line.startswith("> "):
            close_lists()
            out.append(f'<blockquote><p>{md_inline(line[2:])}</p></blockquote>')
            i += 1
            continue

        m = re.match(r"^(#{1,3})\s+(.*)$", line)
        if m:
            close_lists()
            level = len(m.group(1))
            out.append(f"<h{level}>{md_inline(m.group(2))}</h{level}>")
            i += 1
            continue

        if re.match(r"^---+$", line.strip()):
            close_lists()
            out.append("<hr />")
            i += 1
            continue

        if re.match(r"^[-*]\s+", line):
            if in_ol:
                out.append("</ol>")
                in_ol = False
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            item = re.sub(r"^[-*]\s+", "", line)
            out.append(f"<li>{md_inline(item)}</li>")
            i += 1
            continue

        if re.match(r"^\d+\.\s+", line):
            if in_ul:
                out.append("</ul>")
                in_ul = False
            if not in_ol:
                out.append("<ol>")
                in_ol = True
            item = re.sub(r"^\d+\.\s+", "", line)
            out.append(f"<li>{md_inline(item)}</li>")
            i += 1
            continue

        close_lists()
        out.append(f"<p>{md_inline(line)}</p>")
        i += 1

    close_lists()
    flush_table()
    return "\n".join(out)


CSS = """
@page { size: A4; margin: 18mm 16mm; }
:root {
  --ink: #1a1f2e;
  --muted: #5a6478;
  --line: #d8dee9;
  --accent: #0f6e56;
  --code-bg: #f4f6fa;
  --th-bg: #eef3f0;
}
* { box-sizing: border-box; }
html { font-size: 11pt; }
body {
  margin: 0;
  color: var(--ink);
  font-family: "PingFang TC", "Helvetica Neue", "Arial Unicode MS", sans-serif;
  line-height: 1.55;
}
.cover {
  border-bottom: 3px solid var(--accent);
  padding-bottom: 12px;
  margin-bottom: 22px;
}
.cover .eyebrow {
  color: var(--accent);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
}
.cover h1 {
  margin: 6px 0 8px;
  font-size: 1.75rem;
  line-height: 1.25;
}
.cover .meta { color: var(--muted); font-size: 0.9rem; }
h1 { font-size: 1.45rem; margin-top: 1.6em; }
h2 {
  font-size: 1.2rem;
  margin-top: 1.4em;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--line);
}
h3 { font-size: 1.05rem; margin-top: 1.2em; color: #243049; }
p, li { orphans: 3; widows: 3; }
a { color: var(--accent); text-decoration: none; }
blockquote {
  margin: 0.8em 0;
  padding: 0.55em 0.9em;
  border-left: 4px solid var(--accent);
  background: #f3faf7;
  color: #244;
}
pre {
  background: var(--code-bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.4;
  page-break-inside: avoid;
}
code {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: var(--code-bg);
  padding: 0.05em 0.28em;
  border-radius: 3px;
}
pre code { background: none; padding: 0; }
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.9em 0;
  font-size: 0.92rem;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid var(--line);
  padding: 6px 8px;
  vertical-align: top;
  text-align: left;
}
th { background: var(--th-bg); }
hr { border: none; border-top: 1px solid var(--line); margin: 1.4em 0; }
.footer-note {
  margin-top: 2em;
  padding-top: 0.8em;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.85rem;
}
.mask {
  font-family: ui-monospace, Menlo, monospace;
  background: #fff3cd;
  padding: 0 3px;
  border-radius: 2px;
}
"""


def wrap_html(body: str) -> str:
    # Highlight masked secrets visually
    body = body.replace("••••", '<span class="mask">••••</span>')
    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>內容自動化發布工作流解說</title>
<style>{CSS}</style>
</head>
<body>
<header class="cover">
  <div class="eyebrow">Public reference · WanDanLe catalog</div>
  <h1>內容自動化發布工作流解說</h1>
  <div class="meta">Drive → Apps Script → GitHub → Firebase Hosting → Client<br/>
  可複用到其他「遠端 JSON／靜態資料」專案 · 密鑰皆以隱碼標示</div>
</header>
<main>
{body}
</main>
<p class="footer-note">本 PDF 由公開倉庫 docs/ 產生；不含私人 App 原始碼與真實密鑰。</p>
</body>
</html>
"""


def main() -> int:
    src = MD.read_text(encoding="utf-8")
    # Drop the first H1 (covered by cover)
    src = re.sub(r"^# .+\n+", "", src, count=1)
    body = render_md(src)
    HTML_OUT.write_text(wrap_html(body), encoding="utf-8")

    if not Path(CHROME).exists():
        print("Chrome not found; wrote HTML only:", HTML_OUT, file=sys.stderr)
        return 1

    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            f"--print-to-pdf={PDF_OUT}",
            "--no-pdf-header-footer",
            HTML_OUT.as_uri(),
        ],
        check=True,
        capture_output=True,
    )
    print("Wrote", PDF_OUT, "size", PDF_OUT.stat().st_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
