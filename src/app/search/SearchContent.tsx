"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowRight } from "lucide-react";

interface Project {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  githubRepo: string | null;
  category: {
    name: string;
    slug: string;
  };
}

interface SourceProject {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  githubUrl: string | null;
  primaryLanguage: string | null;
  stars: number | null;
  category: {
    name: string;
    slug: string;
  };
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    projects: Project[];
    sourceProjects: SourceProject[];
    total: number;
    query: string;
  } | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [query]);

  if (!query.trim()) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>输入关键词搜索项目...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!results || results.total === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>未找到与 &quot;{query}&quot; 相关的项目</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        找到 {results.total} 个结果（{results.projects.length} 个 Awesome 合集 + {results.sourceProjects.length} 个源码项目）
      </p>

      {/* Awesome 合集结果 */}
      {results.projects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Badge variant="outline">Awesome 合集</Badge>
            <span className="text-sm font-normal text-muted-foreground">
              {results.projects.length} 个
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.projects.map((project) => (
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
                        <Search className="h-3 w-3" />
                        <span className="truncate">{project.githubRepo}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 源码项目结果 */}
      {results.sourceProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Badge variant="secondary">源码项目</Badge>
            <span className="text-sm font-normal text-muted-foreground">
              {results.sourceProjects.length} 个
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.sourceProjects.map((project) => (
              <Link key={project.id} href={`/source/${project.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {project.category.name}
                      </Badge>
                      {project.primaryLanguage && (
                        <Badge variant="secondary" className="text-xs">
                          {project.primaryLanguage}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold line-clamp-1">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {project.description || "暂无描述"}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      {project.stars !== null && project.stars > 0 && (
                        <span className="flex items-center gap-1">
                          <Search className="h-3 w-3" />
                          {project.stars.toLocaleString()} stars
                        </span>
                      )}
                      {project.githubUrl && (
                        <span className="truncate">{project.githubUrl}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchContent() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
