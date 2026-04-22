# 多码网内容维护计划

## 目标
- 定期从 GitHub Explore、OSChina、搜索引擎发现新开源项目
- 自动抓取详细资料（README、stars、forks、license、topics 等）
- 自动分类入库
- 持续 SEO 优化，提升搜索排名

## 数据源
1. **GitHub Trending** — 每日热门项目
2. **GitHub Topics** — 按技术主题浏览
3. **GitHub Search API** — 按 stars/updated 排序搜索
4. **OSChina 项目库** — `https://www.oschina.net/project`
5. **搜索引擎** — 辅助发现（Google 搜索 "site:github.com  awesome-xxx"）

## 脚本体系

```
scripts/
├── run_maintenance.py      # 主入口：协调所有任务
├── discover_github.py      # GitHub Explore/Trending/Topics 发现
├── discover_oschina.py     # OSChina 项目库发现
├── discover_search.py      # 搜索引擎辅助发现
├── fetch_readme.py         # 抓取 README 并转 HTML
├── update_metadata.py      # 更新已有项目的 GitHub 元数据
├── classify_projects.py    # 智能分类已有项目
└── seo/
    ├── generate_sitemap.py # 生成 sitemap.xml
    └── generate_feeds.py   # 生成 RSS/Atom feed
```

## 收录标准

每个项目至少包含：
- ✅ 项目名称、slug、描述
- ✅ GitHub 链接（owner/repo）
- ✅ 主要编程语言
- ✅ Stars / Forks / Issues 数
- ✅ License
- ✅ Topics / Tags
- ✅ README 内容（前 5000 字摘要）
- ✅ 分类归属
- ✅ 项目性质（library/framework/tool/app/cli 等）

## 执行频率

| 任务 | 频率 | 说明 |
|------|------|------|
| GitHub Trending | 每日 | 抓取当天 trending |
| GitHub Topics | 每周 | 轮询主要技术 topic |
| OSChina 发现 | 每周 | 抓取 OSChina 推荐项目 |
| 搜索引擎发现 | 每月 | 搜索 "awesome + 技术关键词" |
| README 补全 | 每周 | 为缺少 readmeContent 的项目补全 |
| 元数据更新 | 每周 | 更新 stars/forks/issues |
| SEO 生成 | 每日 | 重新生成 sitemap |

## SEO 策略

1. **站点地图** — 动态 sitemap.xml 包含所有分类页和项目页
2. **结构化数据** — Schema.org SoftwareApplication JSON-LD
3. **Open Graph** — 每个项目页有独立的 og:title/og:description
4. **Canonical URL** — 避免重复内容
5. **robots.txt** — 允许索引所有公开页面
6. **内部链接** — 项目页底部推荐同类项目
7. **搜索优化** — 修复搜索覆盖 SourceProject
8. **页面速度** — 图片懒加载、数据预取
9. **RSS Feed** — 提供新收录项目 RSS

## 数据库架构

使用 SourceProject 表（比 Project 更详细）：
- `readmeContent` — README 转 HTML 后的内容
- `stars/forks/openIssues` — 实时 GitHub 数据
- `fetchedAt` — 最后更新时间
- `type` — 项目性质（library/framework/tool/app/cli/plugin）
- `tags` — topics 逗号分隔
- `screenshotUrl` — 截图（可选）

## 运行方式

```bash
# 环境变量
export GITHUB_TOKEN=ghp_xxx
export DATABASE_URL=postgresql://...  # 或 SQLite 路径

# 单次完整维护
python scripts/run_maintenance.py --full

# 仅发现新项目
python scripts/run_maintenance.py --discover

# 仅更新已有项目元数据
python scripts/run_maintenance.py --update

# 仅补全 README
python scripts/run_maintenance.py --readme
```

## 监控

- 每次执行记录日志到 `logs/maintenance-YYYY-MM-DD.log`
- 统计：新增项目数、更新项目数、失败数
- 速率限制监控：GitHub API remaining requests
