import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain, Layers, Monitor, Code, Layout, Server, GraduationCap, Database,
  BookOpen, Wrench, Gamepad2, Cloud, Film, Image, Shield, Cpu, Briefcase,
  MessageSquare, Globe, Link2, Box, Search, ArrowRight, Star, TrendingUp
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Brain: <Brain className="h-6 w-6" />,
  Layers: <Layers className="h-6 w-6" />,
  Monitor: <Monitor className="h-6 w-6" />,
  Code: <Code className="h-6 w-6" />,
  Layout: <Layout className="h-6 w-6" />,
  Server: <Server className="h-6 w-6" />,
  GraduationCap: <GraduationCap className="h-6 w-6" />,
  Database: <Database className="h-6 w-6" />,
  BookOpen: <BookOpen className="h-6 w-6" />,
  Wrench: <Wrench className="h-6 w-6" />,
  Gamepad2: <Gamepad2 className="h-6 w-6" />,
  Cloud: <Cloud className="h-6 w-6" />,
  Film: <Film className="h-6 w-6" />,
  Image: <Image className="h-6 w-6" />,
  Shield: <Shield className="h-6 w-6" />,
  Cpu: <Cpu className="h-6 w-6" />,
  Briefcase: <Briefcase className="h-6 w-6" />,
  MessageSquare: <MessageSquare className="h-6 w-6" />,
  Globe: <Globe className="h-6 w-6" />,
  Link: <Link2 className="h-6 w-6" />,
  Box: <Box className="h-6 w-6" />,
};

export const dynamic = "force-dynamic";

const colorMap: Record<string, string> = {
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  slate: "bg-slate-50 text-slate-600 border-slate-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  zinc: "bg-zinc-50 text-zinc-600 border-zinc-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  teal: "bg-teal-50 text-teal-600 border-teal-100",
  pink: "bg-pink-50 text-pink-600 border-pink-100",
  green: "bg-green-50 text-green-600 border-green-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  red: "bg-red-50 text-red-600 border-red-100",
  stone: "bg-stone-50 text-stone-600 border-stone-100",
  yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
  neutral: "bg-neutral-50 text-neutral-600 border-neutral-100",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
  gray: "bg-gray-50 text-gray-600 border-gray-100",
};

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  const sourceCategories = await prisma.sourceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  const totalAwesome = await prisma.project.count();
  const totalSourceProjects = await prisma.sourceProject.count({
    where: { isActive: true },
  });

  const recentProjects = await prisma.project.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  const recentSourceProjects = await prisma.sourceProject.findMany({
    where: { isActive: true },
    take: 8,
    orderBy: { stars: "desc" },
    include: { category: true },
  });

  return (
    <div className="space-y-12 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background pt-16 pb-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            发现优质开源项目
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            多码网是一个免费公益的代码项目分享网站，收录了 {totalSourceProjects.toLocaleString()}+ 个开源源码项目与 {totalAwesome}+ 个 Awesome 精选合集，助你快速找到需要的开发资源。
          </p>
          <form action="/search" className="max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder="搜索项目、技术栈、关键词..."
                className="w-full pl-9 h-12"
              />
            </div>
            <Button type="submit" size="lg">
              搜索
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
            <span>热门:</span>
            {["AI", "React", "Python", "Go", "Docker"].map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${tag}`}
                className="hover:text-primary transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{totalSourceProjects.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1">收录源码项目</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{totalAwesome.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1">Awesome 合集</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{categories.length + sourceCategories.length}</div>
              <div className="text-sm text-muted-foreground mt-1">分类目录</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground mt-1">免费开源</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Source Categories */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">源码分类</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/source-categories">
              查看全部 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sourceCategories.map((cat) => (
            <Link key={cat.id} href={`/source-category/${cat.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border">
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
      </section>

      {/* Source Projects - Trending */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-5 w-5" />
            热门源码项目
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/source-categories">
              查看全部 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recentSourceProjects.map((project) => (
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
                        <Star className="h-3 w-3" />
                        {project.stars.toLocaleString()}
                      </span>
                    )}
                    {project.githubRepo && (
                      <span className="truncate">{project.githubRepo}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Awesome 合集</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/categories">
              查看全部 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border">
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
      </section>

      {/* Recent Projects */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            最新 Awesome 合集
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              查看全部 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recentProjects.map((project) => (
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
      </section>
    </div>
  );
}
