#!/usr/bin/env python3
"""
抓取 GitHub 项目 README 内容，转换为 HTML 后保存到数据库。
支持 Markdown → HTML 转换，提取标题、段落、列表、代码块等。

Usage:
    export GITHUB_TOKEN=ghp_xxx
    python scripts/fetch_readme.py
    python scripts/fetch_readme.py --limit 50
    python scripts/fetch_readme.py --repo facebook/react
    python scripts/fetch_readme.py --category ai
"""

import argparse
import asyncio
import os
import re
import sqlite3
import sys
import textwrap
import html
from typing import Optional, List

import aiohttp

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

BASE_HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "somanycode-readme/1.0",
}
if GITHUB_TOKEN:
    BASE_HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

# GitHub raw content base URL for rendering images
GITHUB_RAW_BASE = "https://raw.githubusercontent.com"


def get_db():
    return sqlite3.connect(DB_PATH)


def simple_md_to_html(md: str, repo: str, default_branch: str = "main") -> str:
    """
    Simple Markdown to HTML converter.
    Not as full-featured as a real parser, but handles common README elements.
    Converts relative image links to absolute GitHub raw URLs.
    """
    lines = md.split("\n")
    html_parts = []
    i = 0
    in_code = False
    code_lang = ""
    code_lines = []
    in_list = False
    list_items = []
    in_blockquote = False
    bq_lines = []

    # Determine owner/repo for image resolution
    parts = repo.split("/")
    owner = parts[0] if len(parts) > 0 else ""
    repo_name = parts[1] if len(parts) > 1 else ""

    def resolve_url(url: str) -> str:
        """Resolve relative URLs to absolute GitHub raw URLs."""
        if not url:
            return url
        url = url.strip()
        if url.startswith("http://") or url.startswith("https://"):
            return url
        if url.startswith("/"):
            return f"{GITHUB_RAW_BASE}/{owner}/{repo_name}/{default_branch}{url}"
        return f"{GITHUB_RAW_BASE}/{owner}/{repo_name}/{default_branch}/{url}"

    def escape_html(text: str) -> str:
        return html.escape(text)

    def inline_md_to_html(text: str) -> str:
        """Convert inline markdown: bold, italic, code, links, images."""
        # Images: ![alt](url)
        text = re.sub(
            r'!\[([^\]]*)\]\(([^)]+)\)',
            lambda m: f'<img src="{escape_html(resolve_url(m.group(2)))}" alt="{escape_html(m.group(1))}" class="max-w-full rounded-md my-2" loading="lazy" />',
            text
        )
        # Links: [text](url)
        text = re.sub(
            r'\[([^\]]+)\]\(([^)]+)\)',
            lambda m: f'<a href="{escape_html(resolve_url(m.group(2)))}" target="_blank" rel="noopener" class="text-primary hover:underline">{escape_html(m.group(1))}</a>',
            text
        )
        # Bold: **text** or __text__
        text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'__([^_]+)__', r'<strong>\1</strong>', text)
        # Italic: *text* or _text_
        text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)
        text = re.sub(r'_([^_]+)_', r'<em>\1</em>', text)
        # Inline code: `code`
        text = re.sub(r'`([^`]+)`', r'<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">\1</code>', text)
        # Strikethrough: ~~text~~
        text = re.sub(r'~~([^~]+)~~', r'<del>\1</del>', text)
        return text

    while i < len(lines):
        line = lines[i]

        # Code blocks
        if line.strip().startswith("```"):
            if not in_code:
                in_code = True
                code_lang = line.strip()[3:].strip() or "text"
                code_lines = []
            else:
                in_code = False
                code_content = escape_html("\n".join(code_lines))
                html_parts.append(
                    f'<pre class="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto my-4"><code class="language-{escape_html(code_lang)}">{code_content}</code></pre>'
                )
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # Horizontal rule
        if re.match(r'^\s*[-*_]{3,}\s*$', line):
            html_parts.append('<hr class="my-6 border-border" />')
            i += 1
            continue

        # Blockquote
        if line.strip().startswith(">"):
            if not in_blockquote:
                in_blockquote = True
                bq_lines = []
            bq_lines.append(line.strip()[1:].strip())
            i += 1
            continue
        elif in_blockquote:
            in_blockquote = False
            bq_content = inline_md_to_html(" ".join(bq_lines))
            html_parts.append(f'<blockquote class="border-l-4 border-primary pl-4 py-1 my-4 italic text-muted-foreground">{bq_content}</blockquote>')
            bq_lines = []
            continue

        # Lists
        list_match = re.match(r'^(\s*)([-*+]|\d+\.)\s+(.*)$', line)
        if list_match:
            if not in_list:
                in_list = True
                list_items = []
            list_items.append((list_match.group(2), list_match.group(3)))
            i += 1
            continue
        elif in_list:
            in_list = False
            is_ordered = any(re.match(r'^\d+\.', item[0]) for item in list_items)
            tag = "ol" if is_ordered else "ul"
            items_html = ""
            for _, content in list_items:
                items_html += f'<li class="my-1">{inline_md_to_html(content)}</li>'
            html_parts.append(f'<{tag} class="list-disc pl-6 my-4 space-y-1">{items_html}</{tag}>')
            list_items = []
            continue

        # Headings
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading_match:
            level = len(heading_match.group(1))
            text = inline_md_to_html(heading_match.group(2).strip())
            tag = f"h{level}"
            size_classes = {
                1: "text-3xl font-bold mt-8 mb-4",
                2: "text-2xl font-bold mt-6 mb-3",
                3: "text-xl font-semibold mt-5 mb-2",
                4: "text-lg font-semibold mt-4 mb-2",
                5: "text-base font-semibold mt-3 mb-1",
                6: "text-sm font-semibold mt-2 mb-1",
            }
            html_parts.append(f'<{tag} class="{size_classes.get(level, "")}">{text}</{tag}>')
            i += 1
            continue

        # Tables (simple)
        if "|" in line and i + 1 < len(lines) and re.match(r'^\s*\|?[\s\-:|]+\|?\s*$', lines[i + 1]):
            # Skip separator line
            i += 1
            table_rows = []
            header = [cell.strip() for cell in line.split("|") if cell.strip()]
            table_rows.append("<tr>" + "".join(f'<th class="border border-border px-3 py-2 bg-muted font-semibold">{escape_html(c)}</th>' for c in header) + "</tr>")
            i += 1
            while i < len(lines) and "|" in lines[i]:
                cells = [cell.strip() for cell in lines[i].split("|") if cell.strip()]
                table_rows.append("<tr>" + "".join(f'<td class="border border-border px-3 py-2">{inline_md_to_html(c)}</td>' for c in cells) + "</tr>")
                i += 1
            html_parts.append(f'<table class="w-full border-collapse my-4 text-sm">{ "".join(table_rows) }</table>')
            continue

        # Empty lines
        if not line.strip():
            i += 1
            continue

        # Regular paragraph
        content = inline_md_to_html(line)
        html_parts.append(f'<p class="my-3 leading-relaxed">{content}</p>')
        i += 1

    # Flush any remaining state
    if in_code:
        code_content = escape_html("\n".join(code_lines))
        html_parts.append(
            f'<pre class="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto my-4"><code class="language-{escape_html(code_lang)}">{code_content}</code></pre>'
        )
    if in_blockquote:
        bq_content = inline_md_to_html(" ".join(bq_lines))
        html_parts.append(f'<blockquote class="border-l-4 border-primary pl-4 py-1 my-4 italic text-muted-foreground">{bq_content}</blockquote>')
    if in_list:
        is_ordered = any(re.match(r'^\d+\.', item[0]) for item in list_items)
        tag = "ol" if is_ordered else "ul"
        items_html = ""
        for _, content in list_items:
            items_html += f'<li class="my-1">{inline_md_to_html(content)}</li>'
        html_parts.append(f'<{tag} class="list-disc pl-6 my-4 space-y-1">{items_html}</{tag}>')

    return "\n".join(html_parts)


async def fetch_readme(session: aiohttp.ClientSession, repo: str) -> Optional[dict]:
    """
    Fetch README from GitHub API. Tries README.md first, then falls back to other variants.
    Returns {content: str, html: str, default_branch: str} or None.
    """
    # First get repo info for default branch
    repo_data = await fetch_api(session, f"/repos/{repo}")
    if not repo_data:
        return None
    default_branch = repo_data.get("default_branch", "main")

    # Try common README filenames
    readme_names = [
        "README.md", "Readme.md", "readme.md",
        "README.rst", "Readme.rst", "readme.rst",
        "README.txt", "Readme.txt", "readme.txt",
        "README", "Readme", "readme",
    ]

    for name in readme_names:
        data = await fetch_api(session, f"/repos/{repo}/contents/{name}")
        if data and not data.get("_rate_limited"):
            if isinstance(data, dict) and data.get("type") == "file":
                import base64
                content_b64 = data.get("content", "")
                try:
                    content = base64.b64decode(content_b64.replace("\n", "")).decode("utf-8", errors="replace")
                    html_content = simple_md_to_html(content, repo, default_branch)
                    return {
                        "content": content,
                        "html": html_content,
                        "default_branch": default_branch,
                        "filename": name,
                    }
                except Exception:
                    continue

    return None


async def fetch_api(session: aiohttp.ClientSession, endpoint: str) -> Optional[dict]:
    url = f"https://api.github.com{endpoint}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status == 404:
                return None
            if resp.status == 403:
                remaining = resp.headers.get("X-RateLimit-Remaining", "0")
                reset_ts = resp.headers.get("X-RateLimit-Reset", "0")
                return {"_rate_limited": True, "_reset_ts": int(reset_ts)}
            if resp.status != 200:
                return None
            return await resp.json()
    except Exception:
        return None


def get_projects_without_readme(conn, limit: int = 0, category: str = "") -> List[tuple]:
    """Get (id, githubRepo) of projects without readmeContent."""
    c = conn.cursor()
    query = """
        SELECT sp.id, sp.githubRepo, sp.name
        FROM SourceProject sp
        WHERE sp.githubRepo IS NOT NULL
          AND (sp.readmeContent IS NULL OR sp.readmeContent = '')
          AND sp.isActive = 1
    """
    params = []
    if category:
        query += " AND sp.categoryId = (SELECT id FROM SourceCategory WHERE slug = ?)"
        params.append(category)
    query += " ORDER BY sp.stars DESC"
    if limit > 0:
        query += f" LIMIT {limit}"
    c.execute(query, params)
    return c.fetchall()


def get_projects_needing_update(conn, limit: int = 0) -> List[tuple]:
    """Get projects where readme hasn't been fetched or is old."""
    c = conn.cursor()
    query = """
        SELECT sp.id, sp.githubRepo, sp.name
        FROM SourceProject sp
        WHERE sp.githubRepo IS NOT NULL
          AND (sp.readmeContent IS NULL OR sp.readmeContent = '')
          AND sp.isActive = 1
        ORDER BY sp.stars DESC
    """
    if limit > 0:
        query += f" LIMIT {limit}"
    c.execute(query)
    return c.fetchall()


def update_project_readme(conn, project_id: str, html: str, raw: str):
    c = conn.cursor()
    c.execute(
        "UPDATE SourceProject SET readmeContent = ?, updatedAt = datetime('now') WHERE id = ?",
        (html, project_id)
    )
    conn.commit()


def truncate_readme(html: str, max_chars: int = 20000) -> str:
    """Truncate HTML content to reasonable size."""
    if len(html) <= max_chars:
        return html
    # Find a good break point (after a closing tag)
    trunc = html[:max_chars]
    last_tag_end = trunc.rfind("</")
    if last_tag_end > max_chars * 0.8:
        trunc = trunc[:last_tag_end]
        # Close any open tags
        open_tags = re.findall(r'<(?!/)([a-zA-Z]+)[^>]*>', trunc)
        close_tags = re.findall(r'</([a-zA-Z]+)>', trunc)
        for tag in reversed(open_tags):
            if close_tags.count(tag) < open_tags.count(tag):
                trunc += f"</{tag}>"
        trunc += '<p class="text-muted-foreground italic mt-4">[内容已截断，查看完整 README 请访问 GitHub]</p>'
        return trunc
    return html[:max_chars] + '<p class="text-muted-foreground italic mt-4">[内容已截断]</p>'


async def main():
    parser = argparse.ArgumentParser(description="Fetch GitHub README content")
    parser.add_argument("--limit", type=int, default=0, help="Max projects to process")
    parser.add_argument("--repo", type=str, help="Specific repo to fetch (owner/repo)")
    parser.add_argument("--category", type=str, help="Only process repos in this category slug")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between API calls")
    parser.add_argument("--truncate", type=int, default=20000, help="Max HTML chars to store")
    args = parser.parse_args()

    if not GITHUB_TOKEN:
        print("WARNING: No GITHUB_TOKEN set. Rate limit is very low for README fetching.")

    conn = get_db()

    projects = []
    if args.repo:
        # Find project by repo
        c = conn.cursor()
        c.execute("SELECT id, githubRepo, name FROM SourceProject WHERE githubRepo = ?", (args.repo,))
        row = c.fetchone()
        if row:
            projects = [row]
        else:
            print(f"Project {args.repo} not found in database")
            conn.close()
            return
    else:
        projects = get_projects_without_readme(conn, args.limit, args.category)

    print(f"Processing {len(projects)} projects without README content")

    success = 0
    failed = 0
    skipped = 0

    async with aiohttp.ClientSession(headers=BASE_HEADERS) as session:
        for i, (pid, repo, name) in enumerate(projects, 1):
            print(f"[{i}/{len(projects)}] Fetching README for {repo} ({name})...")

            result = await fetch_readme(session, repo)
            if not result:
                print(f"  ✗ No README found")
                failed += 1
            elif result.get("_rate_limited"):
                print(f"  ⚠ Rate limited, stopping")
                break
            else:
                html_content = truncate_readme(result["html"], args.truncate)
                update_project_readme(conn, pid, html_content, result["content"])
                content_preview = result["content"][:100].replace("\n", " ")
                print(f"  ✓ README fetched ({len(result['content'])} chars → {len(html_content)} HTML)")
                success += 1

            if args.delay > 0 and i < len(projects):
                await asyncio.sleep(args.delay)

    conn.close()
    print(f"\nDone! Success: {success}, Failed: {failed}, Skipped: {skipped}")


if __name__ == "__main__":
    asyncio.run(main())
