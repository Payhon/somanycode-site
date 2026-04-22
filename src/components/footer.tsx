import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <img src="/logo.png" alt="多码网" className="h-5 w-5 rounded-md" />
            <span className="font-medium">多码网 somanycode.com</span>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            用 <Heart className="h-3 w-3 text-red-500 fill-red-500" /> 打造的免费公益开源导航站
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">首页</Link>
            <Link href="/categories" className="hover:text-foreground transition-colors">合集</Link>
            <Link href="/source-categories" className="hover:text-foreground transition-colors">分类</Link>
            <Link href="https://github.com/payhon/awesome-cn" target="_blank" className="hover:text-foreground transition-colors">GitHub</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
