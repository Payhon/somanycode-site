#!/usr/bin/env python3
"""
高效批量抓取 GitHub 项目信息，支持断点续传和并发。
从 Awesome 合集 HTML 中提取的 GitHub 链接自动抓取并保存。

Usage:
    # 加载 .env 中的 GITHUB_TOKEN 后运行
    export $(grep GITHUB_TOKEN .env | xargs) && python scripts/batch_scrape.py
    
    # 指定并发数和批次大小
    python scripts/batch_scrape.py --workers 10 --batch-size 100
    
    # 限制总数量
    python scripts/batch_scrape.py --max-repos 5000
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

import aiohttp

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
PROGRESS_TABLE = "_scrape_progress"

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
BASE_HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "somanycode-batch-scraper/1.0",
}
if GITHUB_TOKEN:
    BASE_HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"


def get_db():
    return sqlite3.connect(DB_PATH)


def init_progress_table(conn):
    c = conn.cursor()
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS {PROGRESS_TABLE} (
            repo TEXT PRIMARY KEY,
            status TEXT DEFAULT 'pending',
            category_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()


def get_category_maps(conn):
    c = conn.cursor()
    c.execute("SELECT id, slug FROM Category")
    cat_slug = {row[0]: row[1] for row in c.fetchall()}
    c.execute("SELECT slug, id FROM SourceCategory")
    source_cat = {row[0]: row[1] for row in c.fetchall()}
    return cat_slug, source_cat


def extract_github_repos(html_content: str):
    if not html_content:
        return set()
    repos = set()
    pattern = re.compile(
        r'https?://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?![a-zA-Z0-9_./-])'
    )
    skip_owners = {
        'topics','marketplace','features','pricing','login','signup','settings',
        'explore','trending','collections','events','sponsors','about','security',
        'contact','site','status','blog','readme','organizations','users','search',
        'dashboard','pulls','issues','notifications','new','import','gist','apps',
        'mobile','codespaces','copilot','solutions','enterprise','team',
        'customer-stories','education','stars'
    }
    skip_names = {
        'stargazers','forks','watchers','issues','pulls','actions','projects',
        'wiki','security','insights','settings','archive','commits','branches',
        'tags','releases','contributors','license','graphs','network','compare',
        'search','raw','blob','tree'
    }
    for m in pattern.finditer(html_content):
        owner, name = m.group(1), m.group(2)
        if owner in skip_owners or name in skip_names:
            continue
        repos.add(f"{owner}/{name}")
    return repos


def populate_pending_repos(conn):
    """Extract repos from awesome projects and insert into progress table."""
    c = conn.cursor()
    c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (PROGRESS_TABLE,))
    if c.fetchone():
        c.execute(f"SELECT COUNT(*) FROM {PROGRESS_TABLE}")
        row = c.fetchone()
        count = row[0] if row else 0
        if count > 0:
            print(f"Progress table already has {count} repos, skipping extraction.")
            return

    print("Extracting GitHub repos from 663 awesome projects...")
    cat_slug, source_cat = get_category_maps(conn)
    c.execute("SELECT content, categoryId FROM Project WHERE content IS NOT NULL AND content != ''")
    total_inserted = 0
    for content, cat_id in c.fetchall():
        repos = extract_github_repos(content)
        cat_slug_val = cat_slug.get(cat_id, 'misc')
        source_cat_id = source_cat.get(cat_slug_val, source_cat.get('misc'))
        for repo in repos:
            try:
                c.execute(
                    f"INSERT OR IGNORE INTO {PROGRESS_TABLE} (repo, category_id) VALUES (?, ?)",
                    (repo, source_cat_id)
                )
                total_inserted += c.rowcount
            except Exception:
                pass
    conn.commit()
    print(f"Inserted {total_inserted} unique repos into progress table.")


def get_pending_repos(conn, limit: int = 0):
    c = conn.cursor()
    sql = f"SELECT repo, category_id FROM {PROGRESS_TABLE} WHERE status = 'pending' ORDER BY repo"
    if limit > 0:
        sql += f" LIMIT {limit}"
    c.execute(sql)
    return c.fetchall()


def update_repo_status(conn, repo: str, status: str):
    c = conn.cursor()
    c.execute(
        f"UPDATE {PROGRESS_TABLE} SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE repo = ?",
        (status, repo)
    )
    conn.commit()


def slugify(name: str):
    s = re.sub(r'[^\w\s-]', '', name).strip().lower()
    s = re.sub(r'[-\s]+', '-', s)
    return s or "project"


def get_existing_slugs(conn):
    c = conn.cursor()
    c.execute("SELECT slug FROM SourceProject")
    return {row[0] for row in c.fetchall()}


async def fetch_github_repo(session: aiohttp.ClientSession, repo: str):
    url = f"https://api.github.com/repos/{repo}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=20)) as resp:
            if resp.status == 404:
                return None, "not_found"
            if resp.status == 403:
                remaining = resp.headers.get('X-RateLimit-Remaining', '0')
                reset_ts = resp.headers.get('X-RateLimit-Reset', '0')
                return None, f"rate_limited|{remaining}|{reset_ts}"
            if resp.status != 200:
                text = await resp.text()
                return None, f"http_{resp.status}|{text[:200]}"
            data = await resp.json()
            # Also check rate limit from headers
            remaining = resp.headers.get('X-RateLimit-Remaining')
            reset_ts = resp.headers.get('X-RateLimit-Reset')
            return data, f"ok|{remaining}|{reset_ts}"
    except asyncio.TimeoutError:
        return None, "timeout"
    except Exception as e:
        return None, f"error|{str(e)}"


def insert_source_project(conn, data: dict, category_id: str, existing_slugs: set):
    c = conn.cursor()
    base_slug = slugify(data.get('name', 'project'))
    slug = base_slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    existing_slugs.add(slug)

    name = data.get('name', '')
    description = data.get('description') or None
    github_url = data.get('html_url')
    github_repo = data.get('full_name')
    license_name = None
    if data.get('license'):
        license_name = data['license'].get('spdx_id') or data['license'].get('name')
    primary_lang = data.get('language') or None
    stars = data.get('stargazers_count')
    forks = data.get('forks_count')
    open_issues = data.get('open_issues_count')
    homepage = data.get('homepage') or None
    topics = ','.join(data.get('topics', [])) if data.get('topics') else None

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
         primary_lang, stars, forks, open_issues, category_id, topics, 'library')
    )
    conn.commit()
    return slug


async def process_batch(session, conn, batch, existing_slugs, rate_limit_info):
    tasks = [fetch_github_repo(session, repo) for repo, _ in batch]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    success = 0
    for (repo, cat_id), result in zip(batch, results):
        if isinstance(result, Exception):
            print(f"  [ERR] {repo}: {result}")
            update_repo_status(conn, repo, "error")
            continue

        data, status = result
        status_parts = status.split('|')
        status_code = status_parts[0]

        if status_code == "rate_limited":
            reset_ts = int(status_parts[2]) if len(status_parts) > 2 else 0
            rate_limit_info['reset_ts'] = reset_ts
            rate_limit_info['hit'] = True
            print(f"  [RATE] Hit rate limit, reset at {datetime.fromtimestamp(reset_ts, tz=timezone.utc)}")
            break

        if status_code == "not_found":
            update_repo_status(conn, repo, "not_found")
            continue

        if status_code in ("timeout", "error") or data is None:
            print(f"  [{status_code.upper()}] {repo}")
            update_repo_status(conn, repo, "error")
            continue

        try:
            insert_source_project(conn, data, cat_id, existing_slugs)
            update_repo_status(conn, repo, "done")
            success += 1
        except Exception as e:
            print(f"  [DB_ERR] {repo}: {e}")
            update_repo_status(conn, repo, "db_error")

        # Update rate limit info from headers
        if len(status_parts) > 2:
            try:
                rate_limit_info['remaining'] = int(status_parts[1])
                rate_limit_info['reset_ts'] = int(status_parts[2])
            except (ValueError, IndexError):
                pass

    return success


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=10, help="Concurrent requests")
    parser.add_argument("--batch-size", type=int, default=100, help="Repos per batch")
    parser.add_argument("--max-repos", type=int, default=0, help="Max repos to process (0 = all)")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between batches in seconds")
    args = parser.parse_args()

    if not GITHUB_TOKEN:
        print("ERROR: GITHUB_TOKEN not set. Run: export $(grep GITHUB_TOKEN .env | xargs)")
        sys.exit(1)

    print(f"Starting batch scrape with {args.workers} workers, batch size {args.batch_size}")
    print(f"GitHub token: ...{GITHUB_TOKEN[-8:]}")

    conn = get_db()
    init_progress_table(conn)
    populate_pending_repos(conn)

    pending = get_pending_repos(conn, args.max_repos if args.max_repos > 0 else 0)
    total_pending = len(pending)
    print(f"Pending repos to process: {total_pending}")

    if total_pending == 0:
        print("Nothing to do.")
        conn.close()
        return

    existing_slugs = get_existing_slugs(conn)
    rate_limit_info = {'remaining': 5000, 'reset_ts': 0, 'hit': False}

    total_success = 0
    total_failed = 0
    start_time = time.time()

    async with aiohttp.ClientSession(headers=BASE_HEADERS) as session:
        for i in range(0, len(pending), args.batch_size):
            if rate_limit_info.get('hit'):
                reset_ts = rate_limit_info.get('reset_ts', 0)
                wait_secs = max(0, reset_ts - int(time.time()) + 5)
                if wait_secs > 0:
                    print(f"\n[PAUSE] Rate limit hit, sleeping {wait_secs}s until reset...")
                    await asyncio.sleep(wait_secs)
                    rate_limit_info['hit'] = False

            batch = pending[i:i + args.batch_size]
            batch_num = i // args.batch_size + 1
            total_batches = (len(pending) + args.batch_size - 1) // args.batch_size
            print(f"\n[Batch {batch_num}/{total_batches}] Processing {len(batch)} repos...")

            success = await process_batch(session, conn, batch, existing_slugs, rate_limit_info)
            total_success += success
            total_failed += len(batch) - success

            elapsed = time.time() - start_time
            rate = total_success / elapsed * 60 if elapsed > 0 else 0
            print(f"  Progress: {total_success} success, {total_failed} failed, {rate:.1f} repos/min")

            if args.delay > 0:
                await asyncio.sleep(args.delay)

    conn.close()
    elapsed = time.time() - start_time
    print(f"\n{'='*50}")
    print(f"Done! Total: {total_success} success, {total_failed} failed")
    print(f"Elapsed: {elapsed/60:.1f} minutes")
    print(f"Rate: {total_success/elapsed*60:.1f} repos/min")


if __name__ == "__main__":
    asyncio.run(main())
