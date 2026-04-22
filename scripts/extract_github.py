#!/usr/bin/env python3
"""
从 Awesome 合集页面的 HTML 内容中提取 GitHub 项目链接，
抓取 GitHub API meta 信息，保存到 SourceProject 表中。

Usage:
    python scripts/extract_github.py
    python scripts/extract_github.py --limit 100
    python scripts/extract_github.py --category frontend
    GITHUB_TOKEN=xxx python scripts/extract_github.py
"""

import argparse
import os
import re
import sqlite3
import time
import urllib.request
import urllib.error
import json
from urllib.parse import urlparse

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")


def get_github_token():
    return os.environ.get("GITHUB_TOKEN", "")


def fetch_github_api(repo: str, token: str = ""):
    """Fetch GitHub repo info. repo format: owner/repo"""
    url = f"https://api.github.com/repos/{repo}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "somanycode-extractor/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"  [404] Repo not found: {repo}")
        elif e.code == 403:
            print(f"  [403] Rate limited for: {repo}")
        else:
            print(f"  [{e.code}] Error fetching {repo}: {e.reason}")
        return None
    except Exception as e:
        print(f"  [ERR] Failed to fetch {repo}: {e}")
        return None


def extract_github_repos(html_content: str):
    """Extract github.com/owner/repo patterns from HTML."""
    if not html_content:
        return set()

    repos = set()

    # Pattern 1: github.com/owner/repo  (not followed by more path segments)
    pattern1 = re.compile(
        r'https?://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?![a-zA-Z0-9_./-])'
    )
    for m in pattern1.finditer(html_content):
        owner, name = m.group(1), m.group(2)
        # Skip common non-repo paths
        if owner in {"topics", "marketplace", "features", "pricing", "login", "signup",
                     "settings", "explore", "trending", "collections", "events", "sponsors",
                     "about", "security", "contact", "site", "status", "blog", "readme",
                     "organizations", "users", "search", "dashboard", "pulls", "issues",
                     "notifications", "new", "import", "gist", "apps", "mobile", "codespaces",
                     "copilot", "solutions", "enterprise", "team", "customer-stories",
                     "education", "stars", "pull", "commits", "blob", "tree", "raw",
                     "releases", "tags", "actions", "projects", "wiki", "pulse",
                     "graphs", "network", "settings", "compare", "commits"}:
            continue
        if name in {"stargazers", "forks", "watchers", "issues", "pulls", "actions",
                    "projects", "wiki", "security", "insights", "settings", "archive",
                    "commits", "branches", "tags", "releases", "contributors", "license",
                    "graphs", "network", "compare", "search", "raw", "blob", "tree"}:
            continue
        repos.add(f"{owner}/{name}")

    return repos


def get_db():
    return sqlite3.connect(DB_PATH)


def get_category_slug_map(conn):
    c = conn.cursor()
    c.execute("SELECT id, slug FROM Category")
    return {row[0]: row[1] for row in c.fetchall()}


def get_source_category_id_map(conn):
    c = conn.cursor()
    c.execute("SELECT slug, id FROM SourceCategory")
    return {row[0]: row[1] for row in c.fetchall()}


def get_existing_repos(conn):
    c = conn.cursor()
    c.execute("SELECT githubRepo FROM SourceProject WHERE githubRepo IS NOT NULL")
    return {row[0] for row in c.fetchall()}


def slugify(name: str):
    """Convert project name to URL slug."""
    s = re.sub(r'[^\w\s-]', '', name).strip().lower()
    s = re.sub(r'[-\s]+', '-', s)
    return s or "project"


def insert_source_project(conn, data, category_id):
    c = conn.cursor()
    slug = slugify(data.get("name", "project"))
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while True:
        c.execute("SELECT 1 FROM SourceProject WHERE slug = ?", (slug,))
        if not c.fetchone():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    name = data.get("name", "")
    description = data.get("description", "") or None
    github_url = data.get("html_url", "")
    github_repo = data.get("full_name", "")
    license_name = None
    if data.get("license"):
        license_name = data["license"].get("spdx_id") or data["license"].get("name")
    primary_lang = data.get("language") or None
    stars = data.get("stargazers_count")
    forks = data.get("forks_count")
    open_issues = data.get("open_issues_count")
    homepage = data.get("homepage") or None
    topics = ",".join(data.get("topics", [])) if data.get("topics") else None

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
         primary_lang, stars, forks, open_issues, category_id, topics, "library")
    )
    conn.commit()
    return slug


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Limit number of repos to process (0 = all)")
    parser.add_argument("--category", type=str, default="", help="Only process awesome projects in this category slug")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between API requests in seconds")
    args = parser.parse_args()

    token = get_github_token()
    if not token:
        print("WARNING: No GITHUB_TOKEN set. Rate limit is 60 requests/hour.")
        print("Set GITHUB_TOKEN environment variable for higher limits.")
    else:
        print(f"Using GitHub token: {'***' + token[-4:]}")

    conn = get_db()
    cat_slug_map = get_category_slug_map(conn)
    source_cat_map = get_source_category_id_map(conn)
    existing_repos = get_existing_repos(conn)

    # Fetch awesome projects with content
    c = conn.cursor()
    query = """
        SELECT p.slug, p.title, p.content, p.categoryId
        FROM Project p
        WHERE p.content IS NOT NULL AND p.content != ''
    """
    params = ()
    if args.category:
        cat_id = None
        for cid, cslug in cat_slug_map.items():
            if cslug == args.category:
                cat_id = cid
                break
        if not cat_id:
            print(f"Category '{args.category}' not found")
            return
        query += " AND p.categoryId = ?"
        params = (cat_id,)

    c.execute(query, params)
    awesome_projects = c.fetchall()
    print(f"Found {len(awesome_projects)} awesome projects with content")

    # Extract all GitHub repos
    all_repos = set()
    repo_to_category = {}
    for slug, title, content, cat_id in awesome_projects:
        repos = extract_github_repos(content)
        cat_slug = cat_slug_map.get(cat_id, "misc")
        source_cat_id = source_cat_map.get(cat_slug)
        if not source_cat_id:
            source_cat_id = source_cat_map.get("misc")
        for repo in repos:
            all_repos.add(repo)
            # If repo appears in multiple categories, prefer the first one
            if repo not in repo_to_category:
                repo_to_category[repo] = source_cat_id

    print(f"Extracted {len(all_repos)} unique GitHub repos")

    # Filter out existing
    new_repos = [r for r in all_repos if r not in existing_repos]
    print(f"New repos to process: {len(new_repos)}")

    if args.limit > 0:
        new_repos = new_repos[:args.limit]
        print(f"Limited to {args.limit} repos")

    success = 0
    failed = 0
    skipped = 0

    for i, repo in enumerate(new_repos, 1):
        print(f"[{i}/{len(new_repos)}] Fetching {repo}...")
        data = fetch_github_api(repo, token)
        if data is None:
            failed += 1
        else:
            cat_id = repo_to_category.get(repo, source_cat_map.get("misc"))
            try:
                insert_source_project(conn, data, cat_id)
                print(f"  ✓ Saved: {data.get('name', repo)}")
                success += 1
            except Exception as e:
                print(f"  ✗ DB insert failed: {e}")
                failed += 1

        if i < len(new_repos):
            time.sleep(args.delay)

    conn.close()
    print(f"\nDone. Success: {success}, Failed: {failed}, Total new: {len(new_repos)}")


if __name__ == "__main__":
    main()
