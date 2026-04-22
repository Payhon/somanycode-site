import type { Metadata } from "next";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "搜索项目 - 多码网",
  description: "在多码网搜索开源项目，涵盖 AI、前端、后端、数据库、DevOps 等多个技术领域。",
  openGraph: {
    title: "搜索项目 - 多码网",
    description: "在多码网搜索开源项目，涵盖 AI、前端、后端、数据库、DevOps 等多个技术领域。",
    type: "website",
  },
};

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
  githubRepo: string | null;
  githubUrl: string | null;
  stars: number | null;
  primaryLanguage: string | null;
  category: {
    name: string;
    slug: string;
  };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [projectResults, setProjectResults] = useState<Project[]>([]);
  const [sourceResults, setSourceResults] = useState<SourceProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProjectResults(data.projects || []);
      setSourceResults(data.sourceProjects || []);
    } catch {
      setProjectResults([]);
      setSourceResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(query)}`);
  };

  const totalResults = projectResults.length + sourceResults.length;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">搜索项目</h1>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="输入关键词搜索..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "搜索"}
        </Button>
      </form>

      {searched && !loading && (
        <p className="text-sm text-muted-foreground mb-4">
          找到 {totalResults} 个结果
          {query ? ` for "${query}"` : ""}
        </p>
      )}

      {/* Source Projects Results */}
      {sourceResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge variant="secondary">源码项目</Badge>
            <span className="text-sm font-normal text-muted-foreground">({sourceResults.length})</span>
          </h2>
          <div className="space-y-3">
            {sourceResults.map((project) => (
              <Link key={project.id} href={`/source/${project.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{project.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {project.category.name}
                        </Badge>
                        {project.primaryLanguage && (
                          <Badge variant="secondary" className="text-xs">
                            {project.primaryLanguage}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {project.description || "暂无描述"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {project.githubRepo && (
                          <span>{project.githubRepo}</span>
                        )}
                        {project.stars !== null && project.stars > 0 && (
                          <span>⭐ {project.stars.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Awesome Project Results */}
      {projectResults.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge>Awesome 合集</Badge>
            <span className="text-sm font-normal text-muted-foreground">({projectResults.length})</span>
          </h2>
          <div className="space-y-3">
            {projectResults.map((project) => (
              <Link key={project.id} href={`/project/${project.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{project.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {project.category.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {project.description || "暂无描述"}
                      </p>
                      {project.githubRepo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.githubRepo}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {searched && !loading && totalResults === 0 && (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">未找到相关项目</h3>
          <p className="text-muted-foreground mt-1">尝试使用其他关键词，如 "React"、"Python"、"Docker"</p>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}
