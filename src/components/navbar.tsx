"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X, FolderOpen, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="多码网" className="h-7 w-7 rounded-lg" />
          <span className="font-bold text-lg hidden sm:inline">多码网</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex items-center max-w-md flex-1 mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索开源项目..."
              className="w-full pl-9 bg-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">首页</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/categories">
              <FolderOpen className="h-4 w-4 mr-1" />
              合集
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/source-categories">
              <Tag className="h-4 w-4 mr-1" />
              分类
            </Link>
          </Button>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {isOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索开源项目..."
                className="w-full pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/">首页</Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/categories">
                <FolderOpen className="h-4 w-4 mr-2" />
                合集
              </Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/source-categories">
                <Tag className="h-4 w-4 mr-2" />
                分类
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
