import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const layer = searchParams.get('layer')
  const type = searchParams.get('type')
  const q = searchParams.get('q')

  const where: any = {}
  if (layer) where.layer = layer
  if (type) where.type = type
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { org: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [resources, total] = await Promise.all([
    prisma.agentResource.findMany({
      where,
      orderBy: [{ layer: 'asc' }, { stars: 'desc' }],
    }),
    prisma.agentResource.count({ where }),
  ])

  return NextResponse.json({ resources, total })
}
