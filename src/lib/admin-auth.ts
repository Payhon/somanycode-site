import { prisma } from './prisma'

export async function verifyAdminToken(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    return null
  }
  
  const session = await prisma.adminSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() }
    }
  })
  
  return session
}
