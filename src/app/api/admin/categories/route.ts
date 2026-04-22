import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { projects: true } } }
  })
  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const data = await request.json()
  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      icon: data.icon || 'Box',
      color: data.color || 'gray',
      sortOrder: data.sortOrder || 0
    }
  })
  return NextResponse.json(category)
}
