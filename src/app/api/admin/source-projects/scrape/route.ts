import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

function extractRepoFromUrl(url: string): string | null {
  // Match github.com/owner/repo
  const match = url.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/)
  if (!match) return null
  const [, owner, name] = match
  // Skip common non-repo paths
  const skipOwners = new Set([
    'topics','marketplace','features','pricing','login','signup','settings',
    'explore','trending','collections','events','sponsors','about','security',
    'contact','site','status','blog','readme','organizations','users','search',
    'dashboard','pulls','issues','notifications','new','import','gist','apps',
    'mobile','codespaces','copilot','solutions','enterprise','team',
    'customer-stories','education','stars'
  ])
  const skipNames = new Set([
    'stargazers','forks','watchers','issues','pulls','actions','projects',
    'wiki','security','insights','settings','archive','commits','branches',
    'tags','releases','contributors','license','graphs','network','compare',
    'search','raw','blob','tree'
  ])
  if (skipOwners.has(owner) || skipNames.has(name)) return null
  return `${owner}/${name}`
}

async function fetchGitHubRepo(repo: string) {
  const url = `https://api.github.com/repos/${repo}`
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'somanycode-agent/1.0',
  }
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }

  const res = await fetch(url, { headers, next: { revalidate: 0 } })
  if (!res.ok) {
    const text = await res.text()
    return { error: `GitHub API ${res.status}: ${text}` }
  }
  return await res.json()
}

function slugify(name: string): string {
  return name
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '-')
}

export async function POST(request: Request) {
  const session = await verifyAdminToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { url, categorySlug } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const repo = extractRepoFromUrl(url)
  if (!repo) {
    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
  }

  // Check if already exists
  const existing = await prisma.sourceProject.findFirst({
    where: { githubRepo: repo }
  })
  if (existing) {
    return NextResponse.json({
      message: 'Project already exists',
      project: existing,
      existing: true
    })
  }

  // Fetch from GitHub
  const ghData = await fetchGitHubRepo(repo)
  if (ghData.error) {
    return NextResponse.json({ error: ghData.error }, { status: 502 })
  }

  // Determine category
  let categoryId: string | null = null
  if (categorySlug) {
    const cat = await prisma.sourceCategory.findUnique({ where: { slug: categorySlug } })
    if (cat) categoryId = cat.id
  }
  if (!categoryId) {
    // Use language-based heuristic or default to misc
    const lang = ghData.language
    if (lang) {
      const langCat = await prisma.sourceCategory.findFirst({
        where: { slug: lang.toLowerCase() }
      })
      if (langCat) categoryId = langCat.id
    }
  }
  if (!categoryId) {
    const misc = await prisma.sourceCategory.findUnique({ where: { slug: 'misc' } })
    categoryId = misc?.id || ''
  }

  const baseSlug = slugify(ghData.name || repo.split('/')[1])
  let finalSlug = baseSlug
  let counter = 1
  while (await prisma.sourceProject.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${counter}`
    counter++
  }

  const project = await prisma.sourceProject.create({
    data: {
      slug: finalSlug,
      name: ghData.name || repo.split('/')[1],
      description: ghData.description || null,
      url: ghData.homepage || null,
      githubUrl: ghData.html_url,
      githubRepo: ghData.full_name || repo,
      license: ghData.license?.spdx_id || ghData.license?.name || null,
      primaryLanguage: ghData.language || null,
      stars: ghData.stargazers_count ?? null,
      forks: ghData.forks_count ?? null,
      openIssues: ghData.open_issues_count ?? null,
      categoryId,
      tags: (ghData.topics || []).join(','),
      type: 'library',
      isActive: true,
      fetchedAt: new Date(),
    }
  })

  return NextResponse.json({
    message: 'Project scraped and saved',
    project,
  })
}
