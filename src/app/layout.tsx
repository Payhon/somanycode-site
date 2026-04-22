import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://somanycode.com";

export const metadata: Metadata = {
  title: {
    default: "多码网 - 开源项目导航站",
    template: "%s - 多码网",
  },
  description: "somanycode.com 是一个免费公益的代码项目分享网站，收录海量优质开源项目、Awesome 列表与学习资源。按技术领域分类，支持搜索浏览，助你快速找到需要的开发资源。",
  keywords: "开源项目, GitHub, Awesome, 代码分享, 前端, 后端, AI, 机器学习, 开源导航, 开发者工具",
  authors: [{ name: "多码网" }],
  creator: "多码网",
  publisher: "多码网",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: "多码网",
    title: "多码网 - 开源项目导航站",
    description: "免费公益的代码项目分享网站，收录海量优质开源项目与 Awesome 列表。",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "多码网 - 开源项目导航站",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "多码网 - 开源项目导航站",
    description: "免费公益的代码项目分享网站，收录海量优质开源项目与 Awesome 列表。",
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: undefined, // Add Google Search Console verification code here
    baidu: undefined,  // Add Baidu verification code here
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "多码网",
    url: SITE_URL,
    description: "免费公益的代码项目分享网站，收录海量优质开源项目与 Awesome 列表。",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="zh-CN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background flex flex-col`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
