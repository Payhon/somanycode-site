# 多码网 - somanycode.com

基于 Next.js 重构的免费公益代码项目分享网站。

## 特性

- 🚀 Next.js 16 + TypeScript + Tailwind CSS
- 🎨 全新设计的友好专业界面
- 🔍 实时搜索功能
- 📂 分类浏览与管理
- 📝 后台管理系统（分类/项目 CRUD）
- 🗄️ Prisma ORM + PostgreSQL/SQLite
- 📱 响应式设计

## 快速开始

```bash
npm install
npm run dev
```

访问 http://localhost:3000

后台管理: http://localhost:3000/admin/login  
默认密码: `somanycode2024`

## 部署

详见 [DEPLOY.md](./DEPLOY.md)

## 数据结构

- **Category** - 项目分类（AI、前端、后端等）
- **Project** - 开源项目条目
- **AdminSession** - 管理会话

## 技术栈

- [Next.js](https://nextjs.org/)
- [Prisma](https://prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
