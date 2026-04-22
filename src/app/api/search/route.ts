import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q.trim()) {
    return NextResponse.json({ projects: [], sourceProjects: [], total: 0 })
  }

  const [projects, sourceProjects] = await Promise.all([
    // Search Awesome 合集项目
    prisma.project.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { content: { contains: q } },
          { slug: { contains: q } }
        ]
      },
      take: 30,
      orderBy: { title: 'asc' },
      include: { category: true }
    }),
    // Search 源码项目（SourceProject）
    prisma.sourceProject.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { slug: { contains: q } },
          { tags: { contains: q } },
          { primaryLanguage: { contains: q } },
          { githubRepo: { contains: q } }
        ]
      },
      take: 30,
      orderBy: { stars: 'desc' },
      include: { category: true }
    })
  ])

  return NextResponse.json({
    projects,
    sourceProjects,
    total: projects.length + sourceProjects.length,
    query: q
  })
}
