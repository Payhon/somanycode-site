"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Trash2, Edit2, LogOut, FolderOpen, Code2,
  ArrowLeft, Save, Download, Sparkles
} from "lucide-react";

interface SourceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
  _count?: { projects: number };
}

interface SourceProject {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  githubRepo: string | null;
  githubUrl: string | null;
  stars: number | null;
  license: string | null;
  primaryLanguage: string | null;
  categoryId: string;
  category: { name: string };
  isActive: boolean;
}

export default function SourceDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<SourceCategory[]>([]);
  const [projects, setProjects] = useState<SourceProject[]>([]);
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotal, setProjectTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("projects");

  const [categoryForm, setCategoryForm] = useState<Partial<SourceCategory>>({});
  const [projectForm, setProjectForm] = useState<Partial<SourceProject>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeCategory, setScrapeCategory] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("admin_token");
    if (!t) {
      router.push("/admin/login");
      return;
    }
    setToken(t);
    fetchCategories(t);
    fetchProjects(t, 1);
  }, [router]);

  const fetchCategories = async (t: string) => {
    const res = await fetch("/api/admin/source-categories", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      setCategories(await res.json());
    }
  };

  const fetchProjects = async (t: string, page: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/source-projects?page=${page}&limit=20`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects);
      setProjectTotal(data.total);
      setProjectPage(data.page);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const saveCategory = async () => {
    const url = editingCategory
      ? `/api/admin/source-categories/${editingCategory}`
      : "/api/admin/source-categories";
    const method = editingCategory ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(categoryForm),
    });
    if (res.ok) {
      setShowCategoryDialog(false);
      setCategoryForm({});
      setEditingCategory(null);
      fetchCategories(token);
    }
  };

  const saveProject = async () => {
    const url = editingProject
      ? `/api/admin/source-projects/${editingProject}`
      : "/api/admin/source-projects";
    const method = editingProject ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(projectForm),
    });
    if (res.ok) {
      setShowProjectDialog(false);
      setProjectForm({});
      setEditingProject(null);
      fetchProjects(token, projectPage);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const url =
      deleteConfirm.type === "source-category"
        ? `/api/admin/source-categories/${deleteConfirm.id}`
        : `/api/admin/source-projects/${deleteConfirm.id}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setDeleteConfirm(null);
      if (deleteConfirm.type === "source-category") fetchCategories(token);
      else fetchProjects(token, projectPage);
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch("/api/admin/source-projects/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: scrapeUrl.trim(),
          categorySlug: scrapeCategory || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setScrapeResult(`✅ ${data.message}: ${data.project.name}`);
        fetchProjects(token, 1);
      } else {
        setScrapeResult(`❌ ${data.error || '抓取失败'}`);
      }
    } catch (e) {
      setScrapeResult(`❌ 网络错误: ${e}`);
    } finally {
      setScraping(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center justify-center rounded-lg text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2.5">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回网站
          </Link>
          <h1 className="text-2xl font-bold">源码项目管理后台</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-muted-foreground">分类数量</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{projectTotal}</div>
            <div className="text-sm text-muted-foreground">源码项目</div>
          </CardContent>
        </Card>
      </div>

      {/* Scrape Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI Agent 自动抓取
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="粘贴 GitHub 项目 URL，如 https://github.com/facebook/react"
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              className="flex-1"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scrapeCategory}
              onChange={(e) => setScrapeCategory(e.target.value)}
            >
              <option value="">自动分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <Button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()}>
              {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              抓取并保存
            </Button>
          </div>
          {scrapeResult && (
            <p className="mt-3 text-sm">{scrapeResult}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            此接口同时开放给 AI Agent 使用：POST /api/admin/source-projects/scrape {"{"} url, categorySlug? {"}"}，Header 需携带 Authorization: Bearer {'<token>'}
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="projects">
            <Code2 className="mr-2 h-4 w-4" />
            源码项目管理
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderOpen className="mr-2 h-4 w-4" />
            源码分类管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">源码项目列表</h2>
            <Button
              size="sm"
              onClick={() => {
                setProjectForm({});
                setEditingProject(null);
                setShowProjectDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增项目
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>Stars</TableHead>
                  <TableHead>语言</TableHead>
                  <TableHead>协议</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.category?.name}</Badge>
                    </TableCell>
                    <TableCell>{p.stars?.toLocaleString() || "-"}</TableCell>
                    <TableCell>{p.primaryLanguage || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.license || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setProjectForm(p);
                            setEditingProject(p.id);
                            setShowProjectDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirm({ type: "source-project", id: p.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={projectPage <= 1}
              onClick={() => fetchProjects(token, projectPage - 1)}
            >
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {projectPage} 页 / 共 {Math.ceil(projectTotal / 20)} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={projectPage >= Math.ceil(projectTotal / 20)}
              onClick={() => fetchProjects(token, projectPage + 1)}
            >
              下一页
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">源码分类列表</h2>
            <Button
              size="sm"
              onClick={() => {
                setCategoryForm({});
                setEditingCategory(null);
                setShowCategoryDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增分类
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>项目数</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                    <TableCell>{c._count?.projects || 0}</TableCell>
                    <TableCell>{c.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setCategoryForm(c);
                            setEditingCategory(c.id);
                            setShowCategoryDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirm({ type: "source-category", id: c.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "编辑分类" : "新增分类"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={categoryForm.name || ""}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={categoryForm.slug || ""}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={categoryForm.description || ""}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>图标</Label>
                <Input
                  value={categoryForm.icon || ""}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="如: Box"
                />
              </div>
              <div className="space-y-2">
                <Label>颜色</Label>
                <Input
                  value={categoryForm.color || ""}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  placeholder="如: blue"
                />
              </div>
              <div className="space-y-2">
                <Label>排序</Label>
                <Input
                  type="number"
                  value={categoryForm.sortOrder || 0}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>取消</Button>
            <Button onClick={saveCategory}>
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "编辑项目" : "新增项目"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={projectForm.name || ""}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={projectForm.slug || ""}
                onChange={(e) => setProjectForm({ ...projectForm, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                value={projectForm.categoryId || ""}
                onChange={(e) => setProjectForm({ ...projectForm, categoryId: e.target.value })}
              >
                <option value="">请选择分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>GitHub 仓库</Label>
                <Input
                  value={projectForm.githubRepo || ""}
                  onChange={(e) => setProjectForm({ ...projectForm, githubRepo: e.target.value })}
                  placeholder="username/repo"
                />
              </div>
              <div className="space-y-2">
                <Label>GitHub URL</Label>
                <Input
                  value={projectForm.githubUrl || ""}
                  onChange={(e) => setProjectForm({ ...projectForm, githubUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Stars</Label>
                <Input
                  type="number"
                  value={projectForm.stars ?? ""}
                  onChange={(e) => setProjectForm({ ...projectForm, stars: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>主要语言</Label>
                <Input
                  value={projectForm.primaryLanguage || ""}
                  onChange={(e) => setProjectForm({ ...projectForm, primaryLanguage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>开源协议</Label>
                <Input
                  value={projectForm.license || ""}
                  onChange={(e) => setProjectForm({ ...projectForm, license: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={projectForm.description || ""}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>取消</Button>
            <Button onClick={saveProject}>
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              此操作不可撤销，确定要删除吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
