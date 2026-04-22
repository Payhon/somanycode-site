import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  
  if (!q.trim()) {
    return NextResponse.json({ projects: [] })
  }
  
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { content: { contains: q } },
        { slug: { contains: q } }
      ]
    },
    take: 50,
    orderBy: { title: 'asc' },
    include: { category: true }
  })
  
  return NextResponse.json({ projects, query: q })
}
