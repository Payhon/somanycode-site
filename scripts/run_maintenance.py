#!/usr/bin/env python3
"""
多码网内容维护主入口脚本。
协调所有维护任务：发现新项目、抓取 README、更新元数据、SEO 生成。

Usage:
    export GITHUB_TOKEN=ghp_xxx
    python scripts/run_maintenance.py --full          # 完整维护流程
    python scripts/run_maintenance.py --discover      # 仅发现新项目
    python scripts/run_maintenance.py --readme        # 仅补全 README
    python scripts/run_maintenance.py --update        # 仅更新元数据
    python scripts/run_maintenance.py --seo           # 仅生成 SEO 文件
    python scripts/run_maintenance.py --daily         # 每日轻量维护（trending + readme）
    python scripts/run_maintenance.py --weekly        # 每周完整维护
"""

import argparse
import asyncio
import os
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
SCRIPTS_DIR = os.path.dirname(__file__)
LOG_DIR = os.path.join(SCRIPTS_DIR, "..", "logs")

os.makedirs(LOG_DIR, exist_ok=True)


def log(msg: str):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    # Also write to daily log file
    log_file = os.path.join(LOG_DIR, f"maintenance-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.log")
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def run_script(script_name: str, *args) -> bool:
    """Run a Python script with given arguments. Returns True on success."""
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    cmd = [sys.executable, script_path] + list(args)
    log(f"Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.stdout:
            for line in result.stdout.strip().split("\n"):
                log(f"  [OUT] {line}")
        if result.returncode != 0:
            log(f"  [ERR] Exit code {result.returncode}")
            if result.stderr:
                for line in result.stderr.strip().split("\n")[:10]:
                    log(f"  [ERR] {line}")
            return False
        return True
    except subprocess.TimeoutExpired:
        log(f"  [ERR] Timeout after 600s")
        return False
    except Exception as e:
        log(f"  [ERR] {e}")
        return False


def get_db_stats() -> dict:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    stats = {}

    c.execute("SELECT COUNT(*) FROM SourceProject")
    stats["source_projects"] = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM SourceProject WHERE readmeContent IS NOT NULL AND readmeContent != ''")
    stats["with_readme"] = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM SourceCategory")
    stats["source_categories"] = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM Project")
    stats["awesome_projects"] = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM Category")
    stats["awesome_categories"] = c.fetchone()[0]

    c.execute("""
        SELECT c.name, COUNT(sp.id)
        FROM SourceCategory c
        LEFT JOIN SourceProject sp ON c.id = sp.categoryId AND sp.isActive = 1
        GROUP BY c.id
        ORDER BY COUNT(sp.id) DESC
    """)
    stats["category_distribution"] = c.fetchall()

    conn.close()
    return stats


def print_stats(stats: dict):
    log("=" * 50)
    log("DATABASE STATISTICS")
    log("=" * 50)
    log(f"  Source Projects:     {stats['source_projects']}")
    log(f"  With README:         {stats['with_readme']} ({stats['with_readme']/max(stats['source_projects'],1)*100:.1f}%)")
    log(f"  Source Categories:   {stats['source_categories']}")
    log(f"  Awesome Projects:    {stats['awesome_projects']}")
    log(f"  Awesome Categories:  {stats['awesome_categories']}")
    log("")
    log("  Category Distribution:")
    for name, count in stats["category_distribution"]:
        log(f"    {name}: {count}")
    log("=" * 50)


def get_github_token() -> str:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        # Try to read from .env file
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("GITHUB_TOKEN="):
                        token = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                        break
    return token


async def discover_github(min_stars: int = 100):
    """Run GitHub discovery for trending and topics."""
    log("\n[Phase 1] GitHub Discovery")

    # Trending daily
    log("  → GitHub Trending (daily)")
    run_script("discover_github.py", "--trending", "daily", "--limit", "50", "--min-stars", str(min_stars))

    # Trending weekly
    log("  → GitHub Trending (weekly)")
    run_script("discover_github.py", "--trending", "weekly", "--limit", "50", "--min-stars", str(min_stars))

    # Top topics
    log("  → GitHub Topics (limited set)")
    # Limit to a few topics to avoid rate limits
    topics = ["ai", "react", "python", "rust", "docker", "kubernetes", "blockchain", "database"]
    for topic in topics:
        run_script("discover_github.py", "--topic", topic, "--limit", "30", "--min-stars", str(min_stars))


async def discover_oschina():
    """Run OSChina discovery."""
    log("\n[Phase 2] OSChina Discovery")
    # Pick a few key categories
    categories = ["人工智能", "前端开发", "后端开发", "数据库", "开发工具", "云计算", "网络安全"]
    for cat in categories:
        run_script("discover_oschina.py", "--category", cat, "--limit", "15")


async def fetch_readmes(limit: int = 50):
    """Fetch README content for projects that don't have it."""
    log(f"\n[Phase 3] README Fetching (up to {limit})")
    run_script("fetch_readme.py", "--limit", str(limit))


async def update_metadata():
    """Update GitHub metadata (stars, forks, issues) for existing projects."""
    log("\n[Phase 4] Metadata Update")
    # This will be implemented in update_metadata.py
    log("  (update_metadata.py not yet implemented - skipping)")


async def generate_seo():
    """Generate SEO files (sitemap, etc.)."""
    log("\n[Phase 5] SEO Generation")
    # SEO is handled by Next.js dynamic routes, but we can trigger build
    log("  SEO is handled by Next.js app router (sitemap.ts, robots.ts)")
    log("  Run 'npm run build' to regenerate static SEO files")


async def run_daily():
    """Daily lightweight maintenance."""
    log("=" * 60)
    log("DAILY MAINTENANCE START")
    log("=" * 60)
    start_time = time.time()

    await discover_github(min_stars=50)
    await fetch_readmes(limit=30)

    elapsed = time.time() - start_time
    log(f"\nDaily maintenance completed in {elapsed/60:.1f} minutes")

    stats = get_db_stats()
    print_stats(stats)


async def run_weekly():
    """Weekly full maintenance."""
    log("=" * 60)
    log("WEEKLY MAINTENANCE START")
    log("=" * 60)
    start_time = time.time()

    await discover_github(min_stars=30)
    await discover_oschina()
    await fetch_readmes(limit=100)
    await update_metadata()
    await generate_seo()

    elapsed = time.time() - start_time
    log(f"\nWeekly maintenance completed in {elapsed/60:.1f} minutes")

    stats = get_db_stats()
    print_stats(stats)


async def run_full():
    """Full maintenance - everything."""
    log("=" * 60)
    log("FULL MAINTENANCE START")
    log("=" * 60)
    start_time = time.time()

    await discover_github(min_stars=20)
    await discover_oschina()
    await fetch_readmes(limit=200)
    await update_metadata()
    await generate_seo()

    elapsed = time.time() - start_time
    log(f"\nFull maintenance completed in {elapsed/60:.1f} minutes")

    stats = get_db_stats()
    print_stats(stats)


async def main():
    parser = argparse.ArgumentParser(description="Somanycode content maintenance")
    parser.add_argument("--full", action="store_true", help="Run full maintenance")
    parser.add_argument("--daily", action="store_true", help="Run daily maintenance")
    parser.add_argument("--weekly", action="store_true", help="Run weekly maintenance")
    parser.add_argument("--discover", action="store_true", help="Only discover new projects")
    parser.add_argument("--readme", action="store_true", help="Only fetch READMEs")
    parser.add_argument("--update", action="store_true", help="Only update metadata")
    parser.add_argument("--seo", action="store_true", help="Only generate SEO files")
    parser.add_argument("--stats", action="store_true", help="Show database stats")
    args = parser.parse_args()

    token = get_github_token()
    if not token:
        log("WARNING: GITHUB_TOKEN not found. Set it via environment variable or .env file.")
        log("GitHub API rate limit without token: 10 requests/hour (very restrictive)")
    else:
        log(f"GITHUB_TOKEN loaded: ...{token[-8:]}")

    if args.stats:
        stats = get_db_stats()
        print_stats(stats)
        return

    if args.full:
        await run_full()
    elif args.daily:
        await run_daily()
    elif args.weekly:
        await run_weekly()
    elif args.discover:
        await discover_github(min_stars=50)
        await discover_oschina()
    elif args.readme:
        await fetch_readmes(limit=100)
    elif args.update:
        await update_metadata()
    elif args.seo:
        await generate_seo()
    else:
        # Default: daily
        await run_daily()


if __name__ == "__main__":
    asyncio.run(main())
