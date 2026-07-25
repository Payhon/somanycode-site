import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/atlas_data_fixed.json', 'utf-8'))
  console.log(`Importing ${data.length} agent resources...`)

  // Clear existing
  await prisma.agentResource.deleteMany()

  for (const item of data) {
    await prisma.agentResource.create({
      data: {
        code: item.code,
        name: item.name,
        org: item.org || null,
        type: item.type,
        description: item.desc || null,
        layer: item.layer,
        license: item.license || null,
        lang: item.lang || null,
        stars: item.stars || null,
        active: item.active || null,
        tags: item.tags ? item.tags.join(',') : null,
        site: item.site || null,
        github: item.github || null,
      }
    })
  }

  const count = await prisma.agentResource.count()
  console.log(`Imported ${count} agent resources`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
