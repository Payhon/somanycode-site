import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Layers, Monitor, Code, Layout, Server, GraduationCap, Database,
  BookOpen, Wrench, Gamepad2, Cloud, Film, Image, Shield, Cpu, Briefcase,
  MessageSquare, Globe, Link2, Box
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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Awesome 合集 - 多码网",
  description: "浏览所有 Awesome 合集",
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Awesome 合集</h1>
      <p className="text-muted-foreground mb-8">按技术领域浏览精选 Awesome 列表合集</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/category/${cat.slug}`}>
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
