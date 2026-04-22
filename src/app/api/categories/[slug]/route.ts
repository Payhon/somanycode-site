import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      projects: {
        orderBy: { title: 'asc' }
      }
    }
  })
  
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }
  
  return NextResponse.json(category)
}
