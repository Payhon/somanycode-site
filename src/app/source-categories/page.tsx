import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { iconMap, colorMap } from "@/lib/category-style";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "项目分类 - 多码网",
  description: "按技术领域浏览精选开源源码项目",
};

export default async function SourceCategoriesPage() {
  const categories = await prisma.sourceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">项目分类</h1>
      <p className="text-muted-foreground mb-8">
        按技术领域浏览精选开源源码项目，每个分类收录独立的 GitHub 项目
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/source-category/${cat.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${colorMap[cat.color || "gray"]}`}>
                    {iconMap[cat.icon || "Box"]}
                  </div>
                  <Badge variant="secondary">{cat._count.projects}</Badge>
                </div>
                <h3 className="font-semibold mt-3">{cat.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {cat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
