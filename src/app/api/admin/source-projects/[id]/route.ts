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
  const project = await prisma.sourceProject.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await prisma.sourceProject.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
