import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://somanycode.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/source-categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Awesome 分类页
  const categories = await prisma.category.findMany();
  for (const cat of categories) {
    routes.push({
      url: `${SITE_URL}/category/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Awesome 项目页
  const projects = await prisma.project.findMany();
  for (const proj of projects) {
    routes.push({
      url: `${SITE_URL}/project/${proj.slug}`,
      lastModified: proj.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Source 分类页
  const sourceCategories = await prisma.sourceCategory.findMany();
  for (const cat of sourceCategories) {
    routes.push({
      url: `${SITE_URL}/source-category/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Source 项目页（只包含活跃的，限制数量避免 sitemap 过大）
  const sourceProjects = await prisma.sourceProject.findMany({
    where: { isActive: true },
    orderBy: { stars: "desc" },
    take: 5000, // 限制数量，新站先不生成太多
  });
  for (const proj of sourceProjects) {
    routes.push({
      url: `${SITE_URL}/source/${proj.slug}`,
      lastModified: proj.updatedAt,
      changeFrequency: "weekly",
      priority: Math.min(0.5 + (proj.stars || 0) / 100000, 0.9),
    });
  }

  return routes;
}
