import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '24')
  const skip = (page - 1) * limit

  const where = category ? { category: { slug: category }, isActive: true } : { isActive: true }
  const [projects, total] = await Promise.all([
    prisma.sourceProject.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ stars: 'desc' }, { name: 'asc' }],
      include: { category: { select: { name: true, slug: true } } }
    }),
    prisma.sourceProject.count({ where })
  ])

  return NextResponse.json({ projects, total, page, totalPages: Math.ceil(total / limit) })
}
