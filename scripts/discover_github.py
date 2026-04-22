#!/usr/bin/env python3
"""
从 GitHub 多个渠道发现新项目：
1. GitHub Trending (daily/weekly/monthly)
2. GitHub Topics 热门项目
3. GitHub Search API（按 stars 排序）
4. GitHub Collections

Usage:
    export GITHUB_TOKEN=ghp_xxx
    python scripts/discover_github.py
    python scripts/discover_github.py --trending daily --limit 50
    python scripts/discover_github.py --topic python --limit 100
"""

import argparse
import asyncio
import json
import os
import re
import sqlite3
import sys
import time
from datetime import datetime, timezone
from typing import Set, Dict, List, Optional, Tuple

import aiohttp

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

BASE_HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "somanycode-discover/1.0",
}
if GITHUB_TOKEN:
    BASE_HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

# 热门技术 topic，用于轮询发现
TOP_TOPICS = [
    "machine-learning", "deep-learning", "ai", "llm", "chatgpt",
    "react", "vue", "angular", "nextjs", "svelte",
    "python", "rust", "golang", "typescript", "javascript",
    "docker", "kubernetes", "devops", "terraform", "ansible",
    "blockchain", "web3", "defi", "solidity",
    "database", "redis", "postgresql", "mongodb", "elasticsearch",
    "linux", "cli", "terminal", "shell",
    "game-development", "unity", "godot", "threejs",
    "security", "penetration-testing", "cryptography",
    "data-science", "big-data", "spark", "hadoop",
    "iot", "embedded", "arduino", "raspberry-pi",
    "web-scraping", "crawler", "automation",
    "testing", "ci-cd", "github-actions",
    "microservices", "serverless", "graphql",
    "compiler", "interpreter", "programming-language",
    "monitoring", "logging", "observability",
    "editor", "ide", "neovim", "vscode",
    "wasm", "webassembly",
    "edge-computing", "5g",
    "quantum-computing",
]

# 分类映射：topic → SourceCategory slug
TOPIC_TO_CATEGORY = {
    "machine-learning": "ai",
    "deep-learning": "ai",
    "ai": "ai",
    "llm": "ai",
    "chatgpt": "ai",
    "react": "frontend",
    "vue": "frontend",
    "angular": "frontend",
    "nextjs": "frontend",
    "svelte": "frontend",
    "python": "languages",
    "rust": "languages",
    "golang": "languages",
    "typescript": "languages",
    "javascript": "languages",
    "docker": "devops",
    "kubernetes": "devops",
    "devops": "devops",
    "terraform": "devops",
    "ansible": "devops",
    "blockchain": "decentralized",
    "web3": "decentralized",
    "defi": "decentralized",
    "solidity": "decentralized",
    "database": "database",
    "redis": "database",
    "postgresql": "database",
    "mongodb": "database",
    "elasticsearch": "database",
    "linux": "tools",
    "cli": "tools",
    "terminal": "tools",
    "shell": "tools",
    "game-development": "games",
    "unity": "games",
    "godot": "games",
    "threejs": "frontend",
    "security": "security",
    "penetration-testing": "security",
    "cryptography": "security",
    "data-science": "bigdata",
    "big-data": "bigdata",
    "spark": "bigdata",
    "hadoop": "bigdata",
    "iot": "hardware",
    "embedded": "hardware",
    "arduino": "hardware",
    "raspberry-pi": "hardware",
    "web-scraping": "tools",
    "crawler": "tools",
    "automation": "tools",
    "testing": "tools",
    "ci-cd": "devops",
    "github-actions": "devops",
    "microservices": "backend",
    "serverless": "backend",
    "graphql": "backend",
    "compiler": "languages",
    "interpreter": "languages",
    "programming-language": "languages",
    "monitoring": "devops",
    "logging": "devops",
    "observability": "devops",
    "editor": "tools",
    "ide": "tools",
    "neovim": "tools",
    "vscode": "tools",
    "wasm": "frontend",
    "webassembly": "frontend",
    "edge-computing": "hardware",
    "5g": "hardware",
    "quantum-computing": "languages",
}


def get_db():
    return sqlite3.connect(DB_PATH)


def get_source_category_map(conn) -> Dict[str, str]:
    """Return {slug: id} mapping for SourceCategory."""
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


def determine_category(data: dict, cat_map: Dict[str, str]) -> Optional[str]:
    """Determine SourceCategory from GitHub data."""
    # 1. Check topics
    topics = data.get("topics", []) or []
    for topic in topics:
        cat_slug = TOPIC_TO_CATEGORY.get(topic.lower())
        if cat_slug and cat_slug in cat_map:
            return cat_map[cat_slug]

    # 2. Check language
    lang = data.get("language")
    if lang:
        lang_lower = lang.lower()
        cat_slug = TOPIC_TO_CATEGORY.get(lang_lower)
        if cat_slug and cat_slug in cat_map:
            return cat_map[cat_slug]
        # Common languages → languages category
        if lang_lower in {"python", "rust", "go", "typescript", "javascript", "java", "c++", "c", "ruby", "php", "swift", "kotlin", "scala", "dart", "elixir", "haskell", "lua", "perl", "julia", "nim", "zig", "crystal", "clojure", "groovy", "ocaml", "elm", "purescript", "v", "wren", "hare"}:
            return cat_map.get("languages")

    # 3. Check description keywords
    desc = (data.get("description") or "").lower()
    for topic, cat_slug in TOPIC_TO_CATEGORY.items():
        if topic.replace("-", " ") in desc or topic in desc:
            if cat_slug in cat_map:
                return cat_map[cat_slug]

    return cat_map.get("misc")


def determine_type(data: dict) -> str:
    """Determine project type from name/description/topics."""
    name = (data.get("name") or "").lower()
    desc = (data.get("description") or "").lower()
    topics = [t.lower() for t in (data.get("topics") or [])]
    text = f"{name} {desc} {' '.join(topics)}"

    if any(k in text for k in ["framework", "frameworks", "ui framework", "web framework"]):
        return "framework"
    if any(k in text for k in ["library", "libraries", "lib-"]):
        return "library"
    if any(k in text for k in ["cli", "command-line", "commandline", "terminal", "shell", "tool", "utility", "utilities"]):
        return "cli"
    if any(k in text for k in ["app", "application", "desktop app", "mobile app", "web app"]):
        return "app"
    if any(k in text for k in ["platform", "saas", "paaS", "iaas"]):
        return "platform"
    if any(k in text for k in ["plugin", "extension", "addon", "add-on"]):
        return "plugin"
    if any(k in text for k in ["theme", "template", "boilerplate", "starter", "scaffold"]):
        return "theme"
    if any(k in text for k in ["sdk", "api wrapper", "client library", "binding"]):
        return "sdk"
    return "library"


def insert_project(conn, data: dict, category_id: str, existing_slugs: Set[str]) -> Optional[str]:
    """Insert a GitHub project into SourceProject. Returns slug or None."""
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
        print(f"  [DB_ERR] Failed to insert {github_repo}: {e}")
        return None


# ============ GitHub API 调用 ============

async def fetch_github_api(session: aiohttp.ClientSession, endpoint: str) -> Optional[dict]:
    url = f"https://api.github.com{endpoint}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=20)) as resp:
            if resp.status == 404:
                return None
            if resp.status == 403:
                remaining = resp.headers.get("X-RateLimit-Remaining", "0")
                reset_ts = resp.headers.get("X-RateLimit-Reset", "0")
                print(f"  [RATE] Rate limited, reset at {datetime.fromtimestamp(int(reset_ts), tz=timezone.utc)}")
                return {"_rate_limited": True, "_reset_ts": int(reset_ts)}
            if resp.status != 200:
                text = await resp.text()
                print(f"  [HTTP {resp.status}] {endpoint}: {text[:200]}")
                return None
            return await resp.json()
    except asyncio.TimeoutError:
        print(f"  [TIMEOUT] {endpoint}")
        return None
    except Exception as e:
        print(f"  [ERR] {endpoint}: {e}")
        return None


async def discover_trending(session: aiohttp.ClientSession, period: str = "daily") -> List[str]:
    """
    GitHub Trending doesn't have an official API.
    We use GitHub Search API with created:>date filter and sort by stars.
    """
    # For "daily", search repos created in last 7 days, sort by stars
    # For "weekly", last 30 days
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    if period == "daily":
        since = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    elif period == "weekly":
        since = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    else:
        since = (now - timedelta(days=90)).strftime("%Y-%m-%d")

    query = f"created:>{since}"
    endpoint = f"/search/repositories?q={query}&sort=stars&order=desc&per_page=100"
    data = await fetch_github_api(session, endpoint)
    if not data or data.get("_rate_limited"):
        return []

    items = data.get("items", [])
    repos = []
    for item in items:
        full_name = item.get("full_name")
        if full_name:
            repos.append(full_name)
    return repos


async def discover_by_topic(session: aiohttp.ClientSession, topic: str, limit: int = 50) -> List[str]:
    """Search repos by topic, sorted by stars."""
    endpoint = f"/search/repositories?q=topic:{topic}&sort=stars&order=desc&per_page={min(limit, 100)}"
    data = await fetch_github_api(session, endpoint)
    if not data or data.get("_rate_limited"):
        return []

    items = data.get("items", [])
    repos = []
    for item in items:
        full_name = item.get("full_name")
        if full_name:
            repos.append(full_name)
    return repos


async def discover_top_repos_by_language(session: aiohttp.ClientSession, language: str, limit: int = 50) -> List[str]:
    """Search top repos by language, sorted by stars."""
    endpoint = f"/search/repositories?q=language:{language}&sort=stars&order=desc&per_page={min(limit, 100)}"
    data = await fetch_github_api(session, endpoint)
    if not data or data.get("_rate_limited"):
        return []

    items = data.get("items", [])
    repos = []
    for item in items:
        full_name = item.get("full_name")
        if full_name:
            repos.append(full_name)
    return repos


async def fetch_repo_details(session: aiohttp.ClientSession, repo: str) -> Optional[dict]:
    """Fetch full details for a repo (not search summary)."""
    return await fetch_github_api(session, f"/repos/{repo}")


async def process_repos(session, repos: List[str], conn, cat_map: Dict[str, str],
                        existing_repos: Set[str], existing_slugs: Set[str],
                        min_stars: int = 50) -> Tuple[int, int, List[str]]:
    """Process a list of repo names, insert new ones. Returns (success, skipped, new_repos_list)."""
    success = 0
    skipped = 0
    new_repos = []

    for repo in repos:
        if repo in existing_repos:
            skipped += 1
            continue

        data = await fetch_repo_details(session, repo)
        if not data:
            continue
        if data.get("_rate_limited"):
            break

        # Filter: skip forks, low stars, archived
        if data.get("fork", False):
            continue
        if data.get("archived", False):
            continue
        stars = data.get("stargazers_count", 0) or 0
        if stars < min_stars:
            continue

        category_id = determine_category(data, cat_map)
        if not category_id:
            category_id = cat_map.get("misc")

        slug = insert_project(conn, data, category_id, existing_slugs)
        if slug:
            existing_repos.add(repo)
            new_repos.append(repo)
            success += 1
            print(f"  ✓ {repo} ({stars}⭐) → {slug}")

    return success, skipped, new_repos


async def main():
    parser = argparse.ArgumentParser(description="Discover new GitHub projects")
    parser.add_argument("--trending", choices=["daily", "weekly", "monthly"], help="Discover trending repos")
    parser.add_argument("--topic", type=str, help="Discover by specific topic")
    parser.add_argument("--language", type=str, help="Discover by programming language")
    parser.add_argument("--limit", type=int, default=50, help="Max repos to discover")
    parser.add_argument("--min-stars", type=int, default=50, help="Minimum stars filter")
    parser.add_argument("--topics-list", action="store_true", help="Discover from top topics list")
    parser.add_argument("--delay", type=float, default=0.3, help="Delay between API calls")
    args = parser.parse_args()

    if not GITHUB_TOKEN:
        print("WARNING: No GITHUB_TOKEN. Rate limit: 10 requests/minute.")
        print("Set GITHUB_TOKEN for 5000 requests/hour.")

    conn = get_db()
    cat_map = get_source_category_map(conn)
    existing_repos = get_existing_repos(conn)
    existing_slugs = get_existing_slugs(conn)

    total_new = 0
    total_skipped = 0

    async with aiohttp.ClientSession(headers=BASE_HEADERS) as session:
        # 1. Trending
        if args.trending:
            print(f"\n[GitHub Trending - {args.trending}]")
            repos = await discover_trending(session, args.trending)
            repos = repos[:args.limit]
            print(f"  Found {len(repos)} trending repos")
            s, sk, _ = await process_repos(session, repos, conn, cat_map,
                                             existing_repos, existing_slugs, args.min_stars)
            total_new += s
            total_skipped += sk
            if args.delay > 0:
                await asyncio.sleep(args.delay)

        # 2. Specific topic
        if args.topic:
            print(f"\n[GitHub Topic: {args.topic}]")
            repos = await discover_by_topic(session, args.topic, args.limit)
            print(f"  Found {len(repos)} repos")
            s, sk, _ = await process_repos(session, repos, conn, cat_map,
                                           existing_repos, existing_slugs, args.min_stars)
            total_new += s
            total_skipped += sk
            if args.delay > 0:
                await asyncio.sleep(args.delay)

        # 3. Specific language
        if args.language:
            print(f"\n[GitHub Language: {args.language}]")
            repos = await discover_top_repos_by_language(session, args.language, args.limit)
            print(f"  Found {len(repos)} repos")
            s, sk, _ = await process_repos(session, repos, conn, cat_map,
                                           existing_repos, existing_slugs, args.min_stars)
            total_new += s
            total_skipped += sk
            if args.delay > 0:
                await asyncio.sleep(args.delay)

        # 4. Top topics list
        if args.topics_list or (not args.trending and not args.topic and not args.language):
            print(f"\n[GitHub Top Topics - {len(TOP_TOPICS)} topics]")
            for topic in TOP_TOPICS:
                repos = await discover_by_topic(session, topic, min(30, args.limit))
                if not repos:
                    continue
                s, sk, _ = await process_repos(session, repos, conn, cat_map,
                                               existing_repos, existing_slugs, args.min_stars)
                total_new += s
                total_skipped += sk
                print(f"  [{topic}] +{s} new, {sk} skipped")
                if args.delay > 0:
                    await asyncio.sleep(args.delay)

    conn.close()
    print(f"\n{'='*50}")
    print(f"Done! New projects: {total_new}, Skipped (existing): {total_skipped}")
    print(f"Total repos in DB: {len(existing_repos)}")


if __name__ == "__main__":
    asyncio.run(main())
