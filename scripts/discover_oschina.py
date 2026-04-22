#!/usr/bin/env python3
"""
从 OSChina 开源中国项目库发现新项目。
抓取 https://www.oschina.net/project 的热门项目推荐。

Usage:
    python scripts/discover_oschina.py
    python scripts/discover_oschina.py --limit 50
    python scripts/discover_oschina.py --category 人工智能
"""

import argparse
import asyncio
import os
import re
import sqlite3
from typing import Optional, List, Dict, Set, Tuple
from urllib.parse import urljoin

import aiohttp

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")

# OSChina 分类 URL 映射
OSCHINA_CATEGORIES = {
    "人工智能": "https://www.oschina.net/project/zh类别/人工智能",
    "前端开发": "https://www.oschina.net/project/zh类别/Web前端开发",
    "后端开发": "https://www.oschina.net/project/zh类别/服务器端开发",
    "移动开发": "https://www.oschina.net/project/zh类别/手机/移动开发",
    "数据库": "https://www.oschina.net/project/zh类别/数据库相关",
    "开发工具": "https://www.oschina.net/project/zh类别/程序开发工具",
    "应用工具": "https://www.oschina.net/project/zh类别/应用工具",
    "企业应用": "https://www.oschina.net/project/zh类别/企业应用",
    "网络安全": "https://www.oschina.net/project/zh类别/安全相关",
    "游戏娱乐": "https://www.oschina.net/project/zh类别/游戏娱乐",
    "云计算": "https://www.oschina.net/project/zh类别/云计算",
    "大数据": "https://www.oschina.net/project/zh类别/大数据",
    "区块链": "https://www.oschina.net/project/zh类别/区块链",
    "物联网": "https://www.oschina.net/project/zh类别/物联网",
    "硬件相关": "https://www.oschina.net/project/zh类别/硬件相关",
}

# OSChina 分类 → SourceCategory slug
OSCHINA_TO_CATEGORY = {
    "人工智能": "ai",
    "前端开发": "frontend",
    "后端开发": "backend",
    "移动开发": "frontend",
    "数据库": "database",
    "开发工具": "tools",
    "应用工具": "tools",
    "企业应用": "backend",
    "网络安全": "security",
    "游戏娱乐": "games",
    "云计算": "devops",
    "大数据": "bigdata",
    "区块链": "decentralized",
    "物联网": "hardware",
    "硬件相关": "hardware",
}

BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
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


def extract_github_repo(url: str) -> Optional[str]:
    """Extract owner/repo from a GitHub URL."""
    if not url or "github.com" not in url:
        return None
    match = re.search(r'github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)', url)
    if not match:
        return None
    owner, name = match.group(1), match.group(2)
    skip_owners = {'topics','marketplace','features','pricing','login','signup',
                   'settings','explore','trending','collections','events','sponsors',
                   'about','security','contact','site','status','blog','readme',
                   'organizations','users','search','dashboard','pulls','issues',
                   'notifications','new','import','gist','apps','mobile','codespaces',
                   'copilot','solutions','enterprise','team','customer-stories',
                   'education','stars'}
    skip_names = {'stargazers','forks','watchers','issues','pulls','actions','projects',
                  'wiki','security','insights','settings','archive','commits','branches',
                  'tags','releases','contributors','license','graphs','network','compare',
                  'search','raw','blob','tree'}
    if owner in skip_owners or name in skip_names:
        return None
    return f"{owner}/{name}"


def determine_type(name: str, desc: str) -> str:
    text = f"{name} {desc}".lower()
    if any(k in text for k in ["框架", "framework", "frameworks"]):
        return "framework"
    if any(k in text for k in ["库", "library", "libraries", "lib-"]):
        return "library"
    if any(k in text for k in ["工具", "tool", "utility", "cli", "命令行"]):
        return "cli"
    if any(k in text for k in ["应用", "app", "application"]):
        return "app"
    if any(k in text for k in ["平台", "platform"]):
        return "platform"
    if any(k in text for k in ["插件", "plugin", "extension"]):
        return "plugin"
    return "library"


def insert_project(conn, data: dict, category_id: str, existing_slugs: Set[str]) -> Optional[str]:
    c = conn.cursor()
    base_slug = slugify(data.get("name", "project"))
    slug = make_unique_slug(base_slug, existing_slugs)

    name = data.get("name", "")
    description = data.get("description") or None
    github_url = data.get("github_url")
    github_repo = data.get("github_repo")
    license_name = data.get("license")
    primary_lang = data.get("language") or None
    stars = data.get("stars")
    homepage = data.get("homepage") or None
    tags = data.get("tags")
    proj_type = data.get("type", "library")

    try:
        c.execute(
            """
            INSERT INTO SourceProject
            (id, slug, name, description, url, githubUrl, githubRepo, license,
             primaryLanguage, stars, forks, openIssues, categoryId, tags, type,
             isActive, fetchedAt, createdAt, updatedAt)
            VALUES
            (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?,
             ?, ?, NULL, NULL, ?, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'))
            """,
            (slug, name, description, homepage, github_url, github_repo, license_name,
             primary_lang, stars, category_id, tags, proj_type)
        )
        conn.commit()
        return slug
    except Exception as e:
        print(f"  [DB_ERR] Failed to insert {github_repo}: {e}")
        return None


async def fetch_oschina_page(session: aiohttp.ClientSession, url: str) -> Optional[str]:
    """Fetch an OSChina page and return HTML."""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=20), headers=BASE_HEADERS) as resp:
            if resp.status != 200:
                print(f"  [HTTP {resp.status}] {url}")
                return None
            return await resp.text()
    except Exception as e:
        print(f"  [ERR] {url}: {e}")
        return None


def parse_oschina_projects(html: str, category_name: str) -> List[dict]:
    """
    Parse OSChina project list page HTML to extract project info.
    OSChina 项目列表的 HTML 结构可能变化，这里使用灵活的解析策略。
    """
    projects = []

    # Strategy 1: Find project blocks with name, description, and links
    # OSChina typically uses class names like "project-item", "item", etc.

    # Try multiple patterns for project names and links
    # Pattern: project name with link
    name_patterns = [
        r'<a[^>]*href="([^"]*project/[^"]+)"[^>]*>([^<]+)</a>',
        r'<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>',
        r'<div[^>]*class="[^"]*title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>',
        r'<a[^>]*class="[^"]*project-name[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)</a>',
    ]

    for pattern in name_patterns:
        for match in re.finditer(pattern, html, re.IGNORECASE | re.DOTALL):
            link = match.group(1)
            name = re.sub(r'<[^>]+>', '', match.group(2)).strip()
            if not name or len(name) < 2:
                continue
            projects.append({
                "name": name,
                "oschina_url": urljoin("https://www.oschina.net", link),
                "category": category_name,
            })

    # Deduplicate by name
    seen = set()
    unique = []
    for p in projects:
        key = p["name"]
        if key not in seen:
            seen.add(key)
            unique.append(p)

    return unique[:50]  # Limit per page


async def fetch_project_detail(session: aiohttp.ClientSession, project: dict) -> Optional[dict]:
    """Fetch OSChina project detail page to get GitHub link and description."""
    url = project.get("oschina_url")
    if not url:
        return None

    html = await fetch_oschina_page(session, url)
    if not html:
        return None

    result = dict(project)

    # Extract description from meta or page content
    desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if desc_match:
        result["description"] = desc_match.group(1).strip()
    else:
        # Try to find description in page content
        desc_patterns = [
            r'<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)</div>',
            r'<p[^>]*class="[^"]*desc[^"]*"[^>]*>(.*?)</p>',
            r'<div[^>]*class="[^"]*summary[^"]*"[^>]*>(.*?)</div>',
        ]
        for pattern in desc_patterns:
            m = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
            if m:
                desc = re.sub(r'<[^>]+>', ' ', m.group(1)).strip()
                if len(desc) > 10:
                    result["description"] = desc
                    break

    # Extract GitHub link
    github_match = re.search(r'href=["\'](https?://github\.com/[^"\']+)["\']', html, re.IGNORECASE)
    if github_match:
        gh_url = github_match.group(1)
        result["github_url"] = gh_url
        result["github_repo"] = extract_github_repo(gh_url)

    # Extract stars if available
    stars_match = re.search(r'(\d+(?:\.\d+)?)\s*[千k]?\s*[颗个]?[星星⭐]', html, re.IGNORECASE)
    if stars_match:
        stars_str = stars_match.group(1)
        try:
            result["stars"] = int(float(stars_str))
        except ValueError:
            pass

    # Extract license
    license_match = re.search(r'许可协议[：:]\s*([A-Za-z0-9\-]+)', html, re.IGNORECASE)
    if license_match:
        result["license"] = license_match.group(1)

    # Extract language
    lang_patterns = [
        r'开发语言[：:]\s*([^<
]+)',
        r'编程语言[：:]\s*([^<
]+)',
        r'Language[：:]\s*([^<
]+)',
    ]
    for pattern in lang_patterns:
        m = re.search(pattern, html, re.IGNORECASE)
        if m:
            result["language"] = m.group(1).strip()
            break

    return result


async def main():
    parser = argparse.ArgumentParser(description="Discover projects from OSChina")
    parser.add_argument("--category", type=str, help="Specific OSChina category name")
    parser.add_argument("--limit", type=int, default=30, help="Max projects to discover per category")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests")
    args = parser.parse_args()

    conn = get_db()
    cat_map = get_source_category_map(conn)
    existing_repos = get_existing_repos(conn)
    existing_slugs = get_existing_slugs(conn)

    categories_to_scrape = []
    if args.category:
        if args.category in OSCHINA_CATEGORIES:
            categories_to_scrape = [(args.category, OSCHINA_CATEGORIES[args.category])]
        else:
            print(f"Unknown category: {args.category}")
            print(f"Available: {list(OSCHINA_CATEGORIES.keys())}")
            conn.close()
            return
    else:
        categories_to_scrape = list(OSCHINA_CATEGORIES.items())

    total_new = 0
    total_skipped = 0

    async with aiohttp.ClientSession() as session:
        for cat_name, cat_url in categories_to_scrape:
            print(f"\n[OSChina Category: {cat_name}]")

            html = await fetch_oschina_page(session, cat_url)
            if not html:
                continue

            projects = parse_oschina_projects(html, cat_name)
            print(f"  Found {len(projects)} projects on page")

            for i, proj in enumerate(projects[:args.limit], 1):
                print(f"  [{i}] Fetching detail for {proj['name']}...")
                detail = await fetch_project_detail(session, proj)

                if not detail:
                    continue

                # Must have GitHub link
                github_repo = detail.get("github_repo")
                if not github_repo:
                    print(f"    ✗ No GitHub link found")
                    continue

                if github_repo in existing_repos:
                    print(f"    ⊘ Already exists: {github_repo}")
                    total_skipped += 1
                    continue

                # Determine category
                cat_slug = OSCHINA_TO_CATEGORY.get(cat_name, "misc")
                category_id = cat_map.get(cat_slug, cat_map.get("misc"))

                # Set type
                detail["type"] = determine_type(detail.get("name", ""), detail.get("description", ""))

                slug = insert_project(conn, detail, category_id, existing_slugs)
                if slug:
                    existing_repos.add(github_repo)
                    total_new += 1
                    print(f"    ✓ Saved: {github_repo} → {slug}")

                if args.delay > 0:
                    await asyncio.sleep(args.delay)

    conn.close()
    print(f"\n{'='*50}")
    print(f"Done! New projects: {total_new}, Skipped: {total_skipped}")


if __name__ == "__main__":
    asyncio.run(main())
