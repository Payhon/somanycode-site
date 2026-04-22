#!/usr/bin/env python3
"""
通过搜索引擎辅助发现新项目。
搜索 "site:github.com awesome-<topic>" 和 "github.com trending" 相关结果，
提取其中提到的 GitHub 仓库链接。

Usage:
    python scripts/discover_search.py
    python scripts/discover_search.py --query "awesome rust"
    python scripts/discover_search.py --topic rust --limit 30
"""

import argparse
import asyncio
import os
import re
import sqlite3
import subprocess
from typing import Optional, List, Dict, Set

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")

# Search queries for different categories
SEARCH_QUERIES = {
    "ai": [
        "site:github.com awesome machine learning",
        "site:github.com awesome deep learning",
        "site:github.com awesome LLM",
        "site:github.com trending AI",
    ],
    "frontend": [
        "site:github.com awesome react",
        "site:github.com awesome vue",
        "site:github.com awesome frontend",
        "site:github.com trending frontend",
    ],
    "backend": [
        "site:github.com awesome backend",
        "site:github.com awesome microservices",
        "site:github.com awesome API",
        "site:github.com trending backend",
    ],
    "languages": [
        "site:github.com awesome python",
        "site:github.com awesome rust",
        "site:github.com awesome golang",
        "site:github.com awesome typescript",
    ],
    "devops": [
        "site:github.com awesome docker",
        "site:github.com awesome kubernetes",
        "site:github.com awesome devops",
        "site:github.com trending devops",
    ],
    "database": [
        "site:github.com awesome database",
        "site:github.com awesome redis",
        "site:github.com awesome postgres",
        "site:github.com trending database",
    ],
    "security": [
        "site:github.com awesome security",
        "site:github.com awesome CTF",
        "site:github.com awesome penetration testing",
    ],
    "bigdata": [
        "site:github.com awesome big data",
        "site:github.com awesome spark",
        "site:github.com awesome hadoop",
    ],
    "decentralized": [
        "site:github.com awesome blockchain",
        "site:github.com awesome web3",
        "site:github.com awesome solidity",
    ],
    "tools": [
        "site:github.com awesome CLI",
        "site:github.com awesome tools",
        "site:github.com awesome developer tools",
    ],
    "games": [
        "site:github.com awesome game development",
        "site:github.com awesome unity",
        "site:github.com awesome godot",
    ],
    "hardware": [
        "site:github.com awesome IoT",
        "site:github.com awesome embedded",
        "site:github.com awesome raspberry pi",
    ],
}


def get_db():
    return sqlite3.connect(DB_PATH)


def get_source_category_map(conn) -> Dict[str, str]:
    c = conn.cursor()
    c.execute("SELECT slug, id FROM SourceCategory")
    return {row[0]: row[1] for row in c.fetchall()}


def get_existing_repos(conn) -> Set[str]:
    c = conn.cursor()
    c.execute("SELECT githubRepo FROM SourceProject WHERE githubRepo IS NOT NULL")
    return {row[0] for row in c.fetchall()}


def get_existing_slugs(conn) -> Set[str]:
    c = conn.cursor()
    c.execute("SELECT slug FROM SourceProject")
    return {row[0] for row in c.fetchall()}


def slugify(name: str) -> str:
    s = re.sub(r"[^\w\s-]", "", name).strip().lower()
    s = re.sub(r"[-\s]+", "-", s)
    return s or "project"


def make_unique_slug(base: str, existing: Set[str]) -> str:
    slug = base
    counter = 1
    while slug in existing:
        slug = f"{base}-{counter}"
        counter += 1
    existing.add(slug)
    return slug


def extract_github_repos_from_text(text: str) -> Set[str]:
    """Extract all github.com/owner/repo from text."""
    repos = set()
    pattern = re.compile(
        r'https?://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?![a-zA-Z0-9_./-])'
    )
    skip_owners = {
        'topics','marketplace','features','pricing','login','signup',
        'settings','explore','trending','collections','events','sponsors',
        'about','security','contact','site','status','blog','readme',
        'organizations','users','search','dashboard','pulls','issues',
        'notifications','new','import','gist','apps','mobile','codespaces',
        'copilot','solutions','enterprise','team','customer-stories',
        'education','stars'
    }
    skip_names = {
        'stargazers','forks','watchers','issues','pulls','actions','projects',
        'wiki','security','insights','settings','archive','commits','branches',
        'tags','releases','contributors','license','graphs','network','compare',
        'search','raw','blob','tree'
    }
    for m in pattern.finditer(text):
        owner, name = m.group(1), m.group(2)
        if owner in skip_owners or name in skip_names:
            continue
        repos.add(f"{owner}/{name}")
    return repos


def run_web_search(query: str, count: int = 10) -> str:
    """Run web search using kimi_search tool."""
    try:
        # Use kimi_search MCP tool via subprocess or HTTP call
        # Since we're in a Python script, let's try using curl to call the search
        # Or we can just return empty and let the caller handle it
        # For now, we'll write a placeholder that the user can adapt
        result = subprocess.run(
            ["python3", "-c", f"""
import sys
sys.path.insert(0, '/usr/lib/node_modules/openclaw')
# This is a placeholder - in actual use, this script would be called
# from within the OpenClaw environment where kimi_search is available
print("Search query: {query}")
            """],
            capture_output=True, text=True, timeout=30
        )
        return result.stdout or ""
    except Exception as e:
        print(f"  [Search ERR] {e}")
        return ""


async def fetch_github_repo_info(session, repo: str, token: str = "") -> Optional[dict]:
    """Fetch repo info from GitHub API."""
    import aiohttp
    url = f"https://api.github.com/repos/{repo}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "somanycode-search/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=15), headers=headers) as resp:
            if resp.status == 200:
                return await resp.json()
    except Exception:
        pass
    return None


def determine_type(data: dict) -> str:
    text = f"{(data.get('name') or '')} {(data.get('description') or '')}".lower()
    topics = [t.lower() for t in (data.get("topics") or [])]
    text += " " + " ".join(topics)

    if any(k in text for k in ["framework", "frameworks"]):
        return "framework"
    if any(k in text for k in ["library", "libraries"]):
        return "library"
    if any(k in text for k in ["cli", "command-line", "terminal", "shell", "tool"]):
        return "cli"
    if any(k in text for k in ["app", "application"]):
        return "app"
    if any(k in text for k in ["platform", "saas"]):
        return "platform"
    if any(k in text for k in ["plugin", "extension"]):
        return "plugin"
    return "library"


def determine_category(data: dict, cat_map: Dict[str, str]) -> Optional[str]:
    """Determine category from GitHub data."""
    topics = data.get("topics", []) or []
    for topic in topics:
        topic_lower = topic.lower()
        if topic_lower in ["machine-learning", "deep-learning", "ai", "llm", "chatgpt", "neural"]:
            return cat_map.get("ai")
        if topic_lower in ["react", "vue", "angular", "nextjs", "svelte", "frontend"]:
            return cat_map.get("frontend")
        if topic_lower in ["docker", "kubernetes", "devops", "terraform", "ansible", "ci-cd"]:
            return cat_map.get("devops")
        if topic_lower in ["database", "redis", "postgresql", "mongodb", "elasticsearch"]:
            return cat_map.get("database")
        if topic_lower in ["security", "penetration-testing", "cryptography"]:
            return cat_map.get("security")
        if topic_lower in ["blockchain", "web3", "defi", "solidity", "ethereum"]:
            return cat_map.get("decentralized")
        if topic_lower in ["game-development", "unity", "godot"]:
            return cat_map.get("games")
        if topic_lower in ["iot", "embedded", "arduino", "raspberry-pi"]:
            return cat_map.get("hardware")
        if topic_lower in ["big-data", "spark", "hadoop", "data-science"]:
            return cat_map.get("bigdata")

    lang = data.get("language")
    if lang:
        lang_lower = lang.lower()
        if lang_lower in ["python", "rust", "go", "typescript", "javascript", "java", "c++", "c", "ruby", "php", "swift", "kotlin", "scala"]:
            return cat_map.get("languages")

    desc = (data.get("description") or "").lower()
    if any(k in desc for k in ["前端", "frontend", "ui", "css", "html"]):
        return cat_map.get("frontend")
    if any(k in desc for k in ["后端", "backend", "server", "api", "microservice"]):
        return cat_map.get("backend")
    if any(k in desc for k in ["ai", "机器学习", "深度学习", "llm", "大模型"]):
        return cat_map.get("ai")

    return cat_map.get("misc")


def insert_project(conn, data: dict, category_id: str, existing_slugs: Set[str]) -> Optional[str]:
    c = conn.cursor()
    base_slug = slugify(data.get("name", "project"))
    slug = make_unique_slug(base_slug, existing_slugs)

    name = data.get("name", "")
    description = data.get("description") or None
    github_url = data.get("html_url")
    github_repo = data.get("full_name")
    license_name = None
    if data.get("license"):
        license_name = data["license"].get("spdx_id") or data["license"].get("name")
    primary_lang = data.get("language") or None
    stars = data.get("stargazers_count")
    forks = data.get("forks_count")
    open_issues = data.get("open_issues_count")
    homepage = data.get("homepage") or None
    topics = data.get("topics", []) or []
    tags = ",".join(topics) if topics else None
    proj_type = determine_type(data)

    try:
        c.execute(
            """
            INSERT INTO SourceProject
            (id, slug, name, description, url, githubUrl, githubRepo, license,
             primaryLanguage, stars, forks, openIssues, categoryId, tags, type,
             isActive, fetchedAt, createdAt, updatedAt)
            VALUES
            (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'))
            """,
            (slug, name, description, homepage, github_url, github_repo, license_name,
             primary_lang, stars, forks, open_issues, category_id, tags, proj_type)
        )
        conn.commit()
        return slug
    except Exception as e:
        print(f"  [DB_ERR] {github_repo}: {e}")
        return None


async def main():
    parser = argparse.ArgumentParser(description="Discover projects via search engines")
    parser.add_argument("--topic", type=str, help="Specific topic/category to search")
    parser.add_argument("--query", type=str, help="Custom search query")
    parser.add_argument("--limit", type=int, default=20, help="Max repos to add per query")
    parser.add_argument("--min-stars", type=int, default=100, help="Minimum stars filter")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between API calls")
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN", "")

    conn = get_db()
    cat_map = get_source_category_map(conn)
    existing_repos = get_existing_repos(conn)
    existing_slugs = get_existing_slugs(conn)

    # Determine which queries to run
    queries_to_run = []
    if args.query:
        queries_to_run = [("custom", [args.query])]
    elif args.topic:
        if args.topic in SEARCH_QUERIES:
            queries_to_run = [(args.topic, SEARCH_QUERIES[args.topic])]
        else:
            print(f"Unknown topic: {args.topic}")
            print(f"Available: {list(SEARCH_QUERIES.keys())}")
            conn.close()
            return
    else:
        queries_to_run = list(SEARCH_QUERIES.items())

    print("=" * 60)
    print("NOTE: This script requires web search capabilities.")
    print("When running inside OpenClaw, use the kimi_search tool instead.")
    print("This script serves as a template for search-based discovery.")
    print("=" * 60)

    total_new = 0
    total_skipped = 0

    import aiohttp
    async with aiohttp.ClientSession() as session:
        for cat_slug, queries in queries_to_run:
            print(f"\n[Search Category: {cat_slug}]")
            for query in queries:
                print(f"  Query: {query}")
                # In actual OpenClaw context, search results would be injected
                # Here we provide a framework
                print(f"    (Run kimi_search with this query to get results)")

    conn.close()
    print(f"\nDone! New: {total_new}, Skipped: {total_skipped}")
    print("\nTo use search-based discovery inside OpenClaw:")
    print("  1. Run kimi_search with relevant queries")
    print("  2. Extract GitHub repo URLs from results")
    print("  3. Use discover_github.py --repo <owner/repo> to add them")


if __name__ == "__main__":
    asyncio.run(main())
