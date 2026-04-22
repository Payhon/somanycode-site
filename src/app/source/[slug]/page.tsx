import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Star, GitFork, AlertCircle, Calendar, Tag, Type } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://somanycode.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.sourceProject.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!project) return { title: "项目未找到" };

  const title = `${project.name} - ${project.primaryLanguage || "开源项目"} - 多码网`;
  const description = project.description
    ? `${project.description} | Stars: ${project.stars?.toLocaleString() || 0} | Forks: ${project.forks?.toLocaleString() || 0} | 收录于多码网开源导航`
    : `${project.name} 开源项目详情 - 多码网收录了海量优质开源项目，助你快速找到需要的开发资源。`;

  return {
    title,
    description,
    keywords: [
      project.name,
      project.primaryLanguage || "",
      project.category.name,
      ...(project.tags ? project.tags.split(",") : []),
      "开源项目",
      "GitHub",
      "代码分享",
    ].filter(Boolean).join(", "),
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/source/${slug}`,
      siteName: "多码网",
      locale: "zh_CN",
      images: project.screenshotUrl
        ? [{ url: project.screenshotUrl, alt: `${project.name} 截图` }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/source/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SourceProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.sourceProject.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!project) {
    notFound();
  }

  const relatedProjects = await prisma.sourceProject.findMany({
    where: {
      categoryId: project.categoryId,
      id: { not: project.id },
      isActive: true,
    },
    take: 6,
    orderBy: { stars: "desc" },
  });

  const tags = project.tags ? project.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  // Schema.org SoftwareApplication JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.name,
    description: project.description || `${project.name} 开源项目`,
    applicationCategory: project.type || "DeveloperApplication",
    operatingSystem: "Any",
    softwareVersion: "latest",
    url: project.url || project.githubUrl,
    codeRepository: project.githubUrl,
    programmingLanguage: project.primaryLanguage || undefined,
    license: project.license || undefined,
    aggregateRating: project.stars && project.stars > 0 ? {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: project.stars.toString(),
    } : undefined,
    datePublished: project.createdAt.toISOString(),
    dateModified: project.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: project.githubRepo?.split("/")[0] || "Unknown",
    },
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/source-category/${project.category.slug}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回 {project.category.name}
        </Link>
      </Button>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline">{project.category.name}</Badge>
          {project.type && (
            <Badge variant="secondary" className="text-xs">{project.type}</Badge>
          )}
          {project.primaryLanguage && (
            <Badge variant="secondary" className="text-xs">{project.primaryLanguage}</Badge>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-lg text-muted-foreground mt-3">{project.description}</p>
        )}

        <div className="flex flex-wrap gap-4 mt-5 text-sm text-muted-foreground">
          {project.stars !== null && project.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {project.stars.toLocaleString()} stars
            </span>
          )}
          {project.forks !== null && project.forks > 0 && (
            <span className="flex items-center gap-1">
              <GitFork className="h-4 w-4" />
              {project.forks.toLocaleString()} forks
            </span>
          )}
          {project.openIssues !== null && project.openIssues > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {project.openIssues.toLocaleString()} issues
            </span>
          )}
          {project.license && (
            <span className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              {project.license}
            </span>
          )}
          {project.fetchedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              更新于 {new Date(project.fetchedAt).toLocaleDateString("zh-CN")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          {project.githubUrl && (
            <Button asChild>
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub 仓库
              </a>
            </Button>
          )}
          {project.url && project.url !== project.githubUrl && (
            <Button variant="outline" asChild>
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                项目官网
              </a>
            </Button>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <>
          <Separator className="my-6" />
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </>
      )}

      <Separator className="my-6" />

      {project.readmeContent ? (
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <div dangerouslySetInnerHTML={{ __html: project.readmeContent }} />
        </div>
      ) : (
        <div className="text-muted-foreground py-12 text-center">
          暂无详细内容
        </div>
      )}

      {relatedProjects.length > 0 && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="text-xl font-bold mb-4">同类推荐</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProjects.map((p) => (
                <Link key={p.id} href={`/source/${p.slug}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <h3 className="font-medium line-clamp-1">{p.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {p.description || "暂无描述"}
                      </p>
                      {p.stars !== null && p.stars > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Star className="h-3 w-3" />
                          {p.stars.toLocaleString()}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
