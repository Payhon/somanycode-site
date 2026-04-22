import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'somanycode2024'

export async function POST(request: Request) {
  const { password } = await request.json()
  
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  await prisma.adminSession.create({
    data: { token, expiresAt }
  })
  
  return NextResponse.json({ token })
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (token) {
    await prisma.adminSession.deleteMany({ where: { token } })
  }
  
  return NextResponse.json({ success: true })
}
