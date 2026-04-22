# 部署指南

## Vercel 部署

### 1. 准备 PostgreSQL 数据库

推荐使用以下免费 PostgreSQL 服务：

**方案 A: Neon (推荐)**
- 访问 https://neon.tech 注册账号
- 创建新项目，获取连接字符串
- 格式: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

**方案 B: Vercel Postgres**
- 在 Vercel Dashboard 中创建 Postgres 数据库
- 自动获得连接字符串

### 2. 切换数据库配置

```bash
# 复制 PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 安装 Prisma 依赖
npm install

# 设置环境变量
export DATABASE_URL="postgresql://..."

# 执行迁移
npx prisma migrate deploy

# 导入数据（从旧网站）
npx tsx scripts/import-to-postgres.ts
```

### 3. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 4. 环境变量配置

在 Vercel Dashboard > Project Settings > Environment Variables 中添加：

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `ADMIN_PASSWORD` | 后台管理密码 |

### 5. 构建设置

Vercel 会自动读取 `vercel.json` 中的配置。构建时会自动执行：
- `prisma generate` - 生成 Prisma Client
- `prisma migrate deploy` - 执行数据库迁移
- `next build` - 构建 Next.js 应用

## 本地开发

```bash
# 安装依赖
npm install

# SQLite 数据库已包含在项目中
npm run dev
```

默认管理员密码: `somanycode2024` (可在 `.env` 中修改)

## 后台管理

访问 `/admin/login`，输入管理员密码即可进入管理后台。

功能包括：
- 分类管理（增删改查）
- 项目管理（增删改查）
- 支持分页浏览
