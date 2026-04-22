import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const data = await request.json()
  const category = await prisma.sourceCategory.update({
    where: { id },
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await prisma.sourceCategory.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
