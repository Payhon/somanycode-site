import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SearchContent from "./SearchContent";

export const metadata: Metadata = {
  title: "搜索项目 - 多码网",
  description: "在多码网搜索开源项目，涵盖 AI、前端、后端、数据库、DevOps 等多个技术领域。",
  openGraph: {
    title: "搜索项目 - 多码网",
    description: "在多码网搜索开源项目，涵盖 AI、前端、后端、数据库、DevOps 等多个技术领域。",
    type: "website",
  },
};

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">搜索项目</h1>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </div>
  );
}
