import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const BATCH_SIZE = 2000

function getTableData(table: string): any[] {
  const json = execSync(`sqlite3 prisma/dev.db '.mode json' 'SELECT * FROM "${table}"'`, { encoding: 'utf-8', maxBuffer: 200 * 1024 * 1024 })
  return JSON.parse(json)
}

function cleanBoolean(val: any): boolean | undefined {
  if (val === null || val === undefined) return undefined
  return val === 1 || val === true || val === 'true'
}

function cleanDate(val: any): string {
  if (val === null || val === undefined) return new Date().toISOString()
  const d = new Date(val)
  if (isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

function cleanCategories(rows: any[]) {
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    icon: r.icon,
    color: r.color,
    sortOrder: r.sortOrder,
    createdAt: cleanDate(r.createdAt),
    updatedAt: cleanDate(r.updatedAt),
  }))
}

function cleanProjects(rows: any[]) {
  return rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    content: r.content,
    githubRepo: r.githubRepo,
    stars: r.stars,
    tags: r.tags,
    categoryId: r.categoryId,
    createdAt: cleanDate(r.createdAt),
    updatedAt: cleanDate(r.updatedAt),
  }))
}

function cleanSourceCategories(rows: any[]) {
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    icon: r.icon,
    color: r.color,
    sortOrder: r.sortOrder,
    createdAt: cleanDate(r.createdAt),
    updatedAt: cleanDate(r.updatedAt),
  }))
}

function cleanSourceProjects(rows: any[]) {
  return rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    url: r.url,
    githubUrl: r.githubUrl,
    githubRepo: r.githubRepo,
    license: r.license,
    primaryLanguage: r.primaryLanguage,
    stars: r.stars,
    forks: r.forks,
    openIssues: r.openIssues,
    categoryId: r.categoryId,
    tags: r.tags,
    type: r.type,
    readmeContent: r.readmeContent,
    screenshotUrl: r.screenshotUrl,
    isActive: cleanBoolean(r.isActive),
    fetchedAt: cleanDate(r.fetchedAt),
    createdAt: cleanDate(r.createdAt),
    updatedAt: cleanDate(r.updatedAt),
  }))
}

function cleanAdminSessions(rows: any[]) {
  return rows.map((r: any) => ({
    id: r.id,
    token: r.token,
    expiresAt: cleanDate(r.expiresAt),
    createdAt: cleanDate(r.createdAt),
  }))
}

async function main() {
  const prisma = new PrismaClient()

  try {
    // 读取 SQLite 数据
    const categories = getTableData('Category')
    const projects = getTableData('Project')
    const sourceCategories = getTableData('SourceCategory')
    const sourceProjects = getTableData('SourceProject')
    const adminSessions = getTableData('AdminSession')

    console.log(`SQLite data: ${categories.length} categories, ${projects.length} projects, ${sourceCategories.length} sourceCategories, ${sourceProjects.length} sourceProjects, ${adminSessions.length} adminSessions`)

    // 清空 PostgreSQL 现有数据
    console.log('Clearing existing PostgreSQL data...')
    await prisma.sourceProject.deleteMany()
    await prisma.sourceCategory.deleteMany()
    await prisma.project.deleteMany()
    await prisma.category.deleteMany()
    await prisma.adminSession.deleteMany()

    // 插入 Category
    if (categories.length > 0) {
      console.log('Importing categories...')
      const cleaned = cleanCategories(categories)
      for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
        await prisma.category.createMany({ data: cleaned.slice(i, i + BATCH_SIZE) })
      }
    }

    // 插入 Project
    if (projects.length > 0) {
      console.log('Importing projects...')
      const cleaned = cleanProjects(projects)
      for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
        await prisma.project.createMany({ data: cleaned.slice(i, i + BATCH_SIZE) })
      }
    }

    // 插入 SourceCategory
    if (sourceCategories.length > 0) {
      console.log('Importing source categories...')
      const cleaned = cleanSourceCategories(sourceCategories)
      for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
        await prisma.sourceCategory.createMany({ data: cleaned.slice(i, i + BATCH_SIZE) })
      }
    }

    // 插入 SourceProject
    if (sourceProjects.length > 0) {
      console.log('Importing source projects...')
      const cleaned = cleanSourceProjects(sourceProjects)
      for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
        await prisma.sourceProject.createMany({ data: cleaned.slice(i, i + BATCH_SIZE) })
      }
    }

    // 插入 AdminSession
    if (adminSessions.length > 0) {
      console.log('Importing admin sessions...')
      const cleaned = cleanAdminSessions(adminSessions)
      await prisma.adminSession.createMany({ data: cleaned })
    }

    console.log('Import complete!')
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
