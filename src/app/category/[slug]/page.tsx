import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: "合集未找到" };
  return {
    title: `${category.name} - 多码网`,
    description: category.description,
  };
}

const PAGE_SIZE = 24;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { categoryId: category.id },
      orderBy: { title: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.project.count({ where: { categoryId: category.id } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const pageNumbers = (() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  })();

  return (
    <div className="container mx-auto px-4 py-12">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/categories">
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回合集
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        <p className="text-muted-foreground mt-2">{category.description}</p>
        <Badge variant="secondary" className="mt-3">
          共 {total} 个项目
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link key={project.id} href={`/project/${project.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <h3 className="font-semibold line-clamp-1">{project.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {project.description || "暂无描述"}
                </p>
                <div className="flex items-center justify-between mt-4">
                  {project.githubRepo && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span className="truncate max-w-[180px]">{project.githubRepo}</span>
                    </span>
                  )}
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <>
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
              {page > 1 ? (
                <Link href={`/category/${slug}?page=${page - 1}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </span>
              )}
            </Button>

            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  asChild={p !== page}
                >
                  {p !== page ? (
                    <Link href={`/category/${slug}?page=${p}`}>{p}</Link>
                  ) : (
                    <span>{p}</span>
                  )}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link href={`/category/${slug}?page=${page + 1}`}>
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              ) : (
                <span>
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </span>
              )}
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            第 {page} / {totalPages} 页，共 {total} 个项目
          </p>
        </>
      )}
    </div>
  );
}
