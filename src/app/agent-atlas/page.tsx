import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, Star, Tag, Layers } from "lucide-react";

// GitHub icon as SVG component since lucide-react doesn't export it
const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agent 开发资源导航 - 多码网",
  description: "205 个已核验 Agent 开发资源，按技术层级拆解 Agent 技术栈",
};

const LAYER_ORDER = [
  "模型层",
  "API 层",
  "框架 · 服务端",
  "框架 · 客户端",
  "工作流 · 编排",
  "上下文 · 记忆",
  "数据 · 向量存储",
  "沙盒运行环境",
  "浏览器 · Computer Use",
  "Harness 层",
  "协议 · 工具生态",
  "可观测 · 评测",
  "安全 · Guardrails",
  "业务场景工具",
];

const LAYER_COLORS: Record<string, string> = {
  "模型层": "bg-violet-50 text-violet-700 border-violet-200",
  "API 层": "bg-blue-50 text-blue-700 border-blue-200",
  "框架 · 服务端": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "框架 · 客户端": "bg-teal-50 text-teal-700 border-teal-200",
  "工作流 · 编排": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "上下文 · 记忆": "bg-amber-50 text-amber-700 border-amber-200",
  "数据 · 向量存储": "bg-orange-50 text-orange-700 border-orange-200",
  "沙盒运行环境": "bg-rose-50 text-rose-700 border-rose-200",
  "浏览器 · Computer Use": "bg-pink-50 text-pink-700 border-pink-200",
  "Harness 层": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "协议 · 工具生态": "bg-sky-50 text-sky-700 border-sky-200",
  "可观测 · 评测": "bg-lime-50 text-lime-700 border-lime-200",
  "安全 · Guardrails": "bg-red-50 text-red-700 border-red-200",
  "业务场景工具": "bg-slate-50 text-slate-700 border-slate-200",
};

export default async function AgentAtlasPage({
  searchParams,
}: {
  searchParams: Promise<{ layer?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selectedLayer = params.layer || "";
  const query = params.q || "";

  const where: any = {};
  if (selectedLayer) {
    where.layer = selectedLayer;
  }
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { org: { contains: query, mode: "insensitive" } },
    ];
  }

  const [resources, total, layerCounts] = await Promise.all([
    prisma.agentResource.findMany({
      where,
      orderBy: [{ layer: "asc" }, { stars: "desc" }],
    }),
    prisma.agentResource.count({ where }),
    prisma.agentResource.groupBy({
      by: ["layer"],
      _count: { id: true },
    }),
  ]);

  const layerCountMap = new Map(layerCounts.map((l) => [l.layer, l._count.id]));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="font-mono text-sm text-emerald-400 mb-4">
            ~/agent-atlas_
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Agent 开发资源导航
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mb-8">
            205 个已核验资源，按技术层级拆解 Agent 技术栈 —— 模型、网关、框架、沙盒、Harness、评测。
            也支持按语言与业务场景反向检索。
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/40">已核验资源</span>
              <span className="font-mono font-bold text-emerald-400">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40">开源项目</span>
              <span className="font-mono font-bold text-emerald-400">
                {resources.filter((r) => r.type === "开源").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40">技术层级</span>
              <span className="font-mono font-bold text-emerald-400">{LAYER_ORDER.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-16 z-40 border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <form action="/agent-atlas" className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  name="q"
                  placeholder="搜索资源、组织、描述..."
                  defaultValue={query}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              {selectedLayer && <input type="hidden" name="layer" value={selectedLayer} />}
              <Button type="submit" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                搜索
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Link href="/agent-atlas">
                <Badge
                  variant={!selectedLayer ? "default" : "outline"}
                  className={`cursor-pointer ${!selectedLayer ? "bg-emerald-500 text-black" : "border-white/20 text-white/60 hover:text-white"}`}
                >
                  全部 ({resources.length})
                </Badge>
              </Link>
              {LAYER_ORDER.map((layer) => {
                const count = layerCountMap.get(layer) || 0;
                if (count === 0) return null;
                return (
                  <Link key={layer} href={`/agent-atlas?layer=${encodeURIComponent(layer)}`}>
                    <Badge
                      variant={selectedLayer === layer ? "default" : "outline"}
                      className={`cursor-pointer ${selectedLayer === layer ? "bg-emerald-500 text-black" : "border-white/20 text-white/60 hover:text-white"}`}
                    >
                      {layer} ({count})
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Card key={r.id} className="bg-white/5 border-white/10 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-mono text-sm font-bold text-emerald-400">
                      {r.code}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{r.name}</h3>
                      <p className="text-xs text-white/40">{r.org}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${r.type === "开源" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>
                    {r.type}
                  </Badge>
                </div>

                <p className="text-sm text-white/60 mb-4 line-clamp-2">{r.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className={`text-xs ${LAYER_COLORS[r.layer] || "bg-white/10 text-white/60"}`}>
                    <Layers className="h-3 w-3 mr-1" />
                    {r.layer}
                  </Badge>
                  {r.license && (
                    <Badge variant="secondary" className="text-xs bg-white/10 text-white/60">
                      {r.license}
                    </Badge>
                  )}
                  {r.lang && (
                    <Badge variant="secondary" className="text-xs bg-white/10 text-white/60">
                      {r.lang}
                    </Badge>
                  )}
                </div>

                {r.tags && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {r.tags.split(",").map((tag) => (
                      <span key={tag} className="text-xs text-white/40 flex items-center gap-0.5">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    {r.stars && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {r.stars}
                      </span>
                    )}
                    {r.active && <span>{r.active}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.site && (
                      <a href={r.site} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-emerald-400 transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {r.github && (
                      <a href={r.github} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-emerald-400 transition-colors">
                        <GithubIcon className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {resources.length === 0 && (
          <div className="text-center py-16 text-white/40">
            未找到匹配的资源
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-white/40">
          <p>数据来源: <a href="https://agent-atlas.ok.kimi.link" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Agent Atlas</a></p>
          <p className="mt-2">205 个已核验资源 · 数据快照: 2026-07-25</p>
        </div>
      </footer>
    </div>
  );
}
