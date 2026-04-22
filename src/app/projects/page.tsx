import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "全部项目 - 多码网",
  description: "浏览所有收录的开源项目",
};

const PAGE_SIZE = 24;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      orderBy: { title: "asc" },
      include: { category: true },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.project.count(),
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
      <h1 className="text-3xl font-bold mb-2">全部项目</h1>
      <p className="text-muted-foreground mb-8">
        浏览所有收录的精选开源项目，共 {total} 个
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link key={project.id} href={`/project/${project.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {project.category.name}
                  </Badge>
                </div>
                <h3 className="font-semibold line-clamp-1">{project.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {project.description || "暂无描述"}
                </p>
                {project.githubRepo && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" />
                    <span className="truncate">{project.githubRepo}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            asChild={page > 1}
          >
            {page > 1 ? (
              <Link href={`/projects?page=${page - 1}`}>
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
                  <Link href={`/projects?page=${p}`}>{p}</Link>
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
              <Link href={`/projects?page=${page + 1}`}>
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
      )}

      <p className="text-center text-sm text-muted-foreground mt-4">
        第 {page} / {totalPages} 页，共 {total} 个项目
      </p>
    </div>
  );
}
