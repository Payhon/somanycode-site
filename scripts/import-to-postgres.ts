import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const jsonPath = path.join(process.cwd(), '..', 'projects_with_categories.json')
  
  if (!fs.existsSync(jsonPath)) {
    console.log('No JSON backup found.')
    process.exit(1)
  }
  
  const projects = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  console.log(`Found ${projects.length} projects in backup`)
  
  const categories = new Map<string, { slug: string; projects: typeof projects }>()
  for (const p of projects) {
    const catName = p.category || '杂项'
    if (!categories.has(catName)) {
      categories.set(catName, { slug: catName.toLowerCase().replace(/\s+/g, '-'), projects: [] })
    }
    categories.get(catName)!.projects.push(p)
  }
  
  await prisma.project.deleteMany()
  await prisma.category.deleteMany()
  
  let sortOrder = 0
  for (const [catName, data] of categories) {
    const category = await prisma.category.create({
      data: {
        name: catName,
        slug: data.slug,
        description: '',
        sortOrder: sortOrder++,
      }
    })
    
    for (const p of data.projects) {
      await prisma.project.create({
        data: {
          slug: p.slug,
          title: p.title,
          description: p.description || '',
          githubRepo: p.github_repo,
          categoryId: category.id,
        }
      })
    }
    
    console.log(`Created category ${catName} with ${data.projects.length} projects`)
  }
  
  console.log('Import complete!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
