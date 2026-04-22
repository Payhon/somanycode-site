import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const categorySlug = searchParams.get('category')
  
  const where: any = {}
  if (categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } })
    if (category) {
      where.categoryId = category.id
    }
  }
  
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { title: 'asc' },
      include: { category: true }
    }),
    prisma.project.count({ where })
  ])
  
  return NextResponse.json({ projects, total, page, limit, totalPages: Math.ceil(total / limit) })
}
