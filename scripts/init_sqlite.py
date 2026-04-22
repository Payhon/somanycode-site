#!/usr/bin/env python3
"""
Initialize SQLite database for local development and maintenance scripts.
Creates tables matching Prisma schema and seeds initial categories.

Usage:
    python scripts/init_sqlite.py
"""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")

SCHEMA_SQL = """
-- Category (Awesome 合集分类)
CREATE TABLE IF NOT EXISTS Category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    sortOrder INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project (Awesome 合集项目)
CREATE TABLE IF NOT EXISTS Project (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    githubRepo TEXT,
    stars INTEGER DEFAULT 0,
    tags TEXT DEFAULT '',
    categoryId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_category ON Project(categoryId);
CREATE INDEX IF NOT EXISTS idx_project_slug ON Project(slug);
CREATE INDEX IF NOT EXISTS idx_project_title ON Project(title);

-- SourceCategory (源码项目分类)
CREATE TABLE IF NOT EXISTS SourceCategory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    sortOrder INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SourceProject (源码项目)
CREATE TABLE IF NOT EXISTS SourceProject (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT,
    githubUrl TEXT,
    githubRepo TEXT,
    license TEXT,
    primaryLanguage TEXT,
    stars INTEGER,
    forks INTEGER,
    openIssues INTEGER,
    categoryId TEXT NOT NULL,
    tags TEXT,
    type TEXT,
    readmeContent TEXT,
    screenshotUrl TEXT,
    isActive INTEGER DEFAULT 1,
    fetchedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES SourceCategory(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sourceproject_category ON SourceProject(categoryId);
CREATE INDEX IF NOT EXISTS idx_sourceproject_slug ON SourceProject(slug);
CREATE INDEX IF NOT EXISTS idx_sourceproject_name ON SourceProject(name);
CREATE INDEX IF NOT EXISTS idx_sourceproject_repo ON SourceProject(githubRepo);

-- AdminSession
CREATE TABLE IF NOT EXISTS AdminSession (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

SOURCE_CATEGORIES = [
    ("cuid-ai", "人工智能", "ai", "AI / 机器学习 / 深度学习 / LLM 等大模型相关开源项目", "Brain", "violet", 1),
    ("cuid-frontend", "前端开发", "frontend", "React / Vue / Angular / Svelte 等前端框架、UI 库、工具链", "Monitor", "blue", 2),
    ("cuid-backend", "后端开发", "backend", "后端框架、API、微服务、GraphQL、RPC 等", "Server", "emerald", 3),
    ("cuid-languages", "编程语言", "languages", "编程语言、编译器、解释器、运行时", "Code", "amber", 4),
    ("cuid-database", "数据库", "database", "数据库、缓存、搜索引擎、ORM、数据工具", "Database", "sky", 5),
    ("cuid-devops", "DevOps & 云原生", "devops", "Docker / Kubernetes / Terraform / 监控 / CI-CD", "Cloud", "cyan", 6),
    ("cuid-security", "网络安全", "security", "安全工具、渗透测试、加密、漏洞扫描", "Shield", "rose", 7),
    ("cuid-bigdata", "大数据", "bigdata", "Hadoop / Spark / Flink / 数据仓库 / ETL", "Layers", "indigo", 8),
    ("cuid-decentralized", "区块链 & Web3", "decentralized", "区块链、Web3、DeFi、智能合约、Solidity", "Globe", "purple", 9),
    ("cuid-tools", "开发工具", "tools", "编辑器、IDE、CLI 工具、调试器、脚手架", "Wrench", "slate", 10),
    ("cuid-games", "游戏开发", "games", "游戏引擎、游戏框架、游戏工具、游戏资源", "Gamepad2", "teal", 11),
    ("cuid-hardware", "物联网 & 硬件", "hardware", "IoT、嵌入式、Arduino、树莓派、FPGA", "Cpu", "orange", 12),
    ("cuid-misc", "其他", "misc", "未分类或其他类型的开源项目", "Box", "gray", 99),
]


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("Creating tables...")
    c.executescript(SCHEMA_SQL)
    conn.commit()
    print("✓ Tables created")

    # Seed SourceCategories
    print("\nSeeding SourceCategory...")
    for row in SOURCE_CATEGORIES:
        c.execute("""
            INSERT OR IGNORE INTO SourceCategory (id, name, slug, description, icon, color, sortOrder)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, row)
    conn.commit()

    c.execute("SELECT COUNT(*) FROM SourceCategory")
    count = c.fetchone()[0]
    print(f"✓ {count} source categories seeded")

    # Seed some basic Awesome Categories (for the existing system)
    print("\nSeeding Category (Awesome)...")
    awesome_cats = [
        ("cuid-aw-ai", "人工智能", "ai", "AI / ML / DL / LLM 相关资源", "Brain", "violet", 1),
        ("cuid-aw-frontend", "前端开发", "frontend", "前端框架、UI 库、工具链", "Monitor", "blue", 2),
        ("cuid-aw-backend", "后端开发", "backend", "后端框架、API、微服务", "Server", "emerald", 3),
        ("cuid-aw-tools", "开发工具", "tools", "编辑器、CLI、脚手架", "Wrench", "slate", 4),
        ("cuid-aw-mobile", "移动端开发", "mobile", "iOS / Android / Flutter / React Native", "Smartphone", "cyan", 5),
        ("cuid-aw-database", "数据库", "database", "数据库、缓存、搜索引擎", "Database", "sky", 6),
        ("cuid-aw-devops", "DevOps", "devops", "Docker / K8s / CI-CD / 监控", "Cloud", "indigo", 7),
        ("cuid-aw-security", "网络安全", "security", "安全工具、渗透测试、加密", "Shield", "rose", 8),
        ("cuid-aw-bigdata", "大数据", "bigdata", "Hadoop / Spark / 数据分析", "Layers", "purple", 9),
        ("cuid-aw-blockchain", "区块链", "blockchain", "Web3 / DeFi / 智能合约", "Globe", "fuchsia", 10),
        ("cuid-aw-games", "游戏开发", "games", "游戏引擎、游戏框架、游戏工具", "Gamepad2", "teal", 11),
        ("cuid-aw-iot", "物联网", "iot", "IoT、嵌入式、智能硬件", "Cpu", "orange", 12),
        ("cuid-aw-education", "学习资源", "education", "教程、书籍、课程", "BookOpen", "green", 13),
        ("cuid-aw-misc", "其他", "misc", "其他未分类资源", "Box", "gray", 99),
    ]
    for row in awesome_cats:
        c.execute("""
            INSERT OR IGNORE INTO Category (id, name, slug, description, icon, color, sortOrder)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, row)
    conn.commit()

    c.execute("SELECT COUNT(*) FROM Category")
    count = c.fetchone()[0]
    print(f"✓ {count} awesome categories seeded")

    # Show summary
    c.execute("SELECT name, slug FROM SourceCategory ORDER BY sortOrder")
    print("\nSource Categories:")
    for name, slug in c.fetchall():
        print(f"  - {name} ({slug})")

    conn.close()
    print(f"\n✅ Database initialized: {DB_PATH}")


if __name__ == "__main__":
    init_db()
