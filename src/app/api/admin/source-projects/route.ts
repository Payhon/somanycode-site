import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const categoryId = searchParams.get('categoryId')

  const where: any = {}
  if (categoryId) where.categoryId = categoryId

  const [projects, total] = await Promise.all([
    prisma.sourceProject.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    }),
    prisma.sourceProject.count({ where })
  ])

  return NextResponse.json({ projects, total, page, limit, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: Request) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()
  const project = await prisma.sourceProject.create({
    data: {
      slug: data.slug,
      name: data.name,
      description: data.description || '',
      url: data.url || null,
      githubUrl: data.githubUrl || null,
      githubRepo: data.githubRepo || null,
      license: data.license || null,
      primaryLanguage: data.primaryLanguage || null,
      stars: data.stars ?? null,
      forks: data.forks ?? null,
      openIssues: data.openIssues ?? null,
      categoryId: data.categoryId,
      tags: data.tags || '',
      type: data.type || null,
      readmeContent: data.readmeContent || null,
      isActive: data.isActive ?? true,
    }
  })
  return NextResponse.json(project)
}
