import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const categories = await prisma.sourceCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { projects: true } } }
  })
  return NextResponse.json(categories)
}
