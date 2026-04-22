import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const data = await request.json()
  const project = await prisma.project.update({
    where: { id: id },
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description,
      content: data.content,
      githubRepo: data.githubRepo,
      categoryId: data.categoryId,
      tags: data.tags || ''
    }
  })
  return NextResponse.json(project)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  await prisma.project.delete({ where: { id: id } })
  return NextResponse.json({ success: true })
}
