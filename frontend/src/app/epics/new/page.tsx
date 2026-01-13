"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Project {
    id: string;
    title: string;
}

export default function NewEpicPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectIdParam = searchParams.get("projectId");

    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        projectId: projectIdParam || "",
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        // プロジェクト一覧を取得
        const fetchProjects = async () => {
            try {
                const res = await fetch("http://localhost:3001/api/projects", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                    setProjects(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch projects:", error);
            }
        };

        fetchProjects();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const res = await fetch("http://localhost:3001/api/epics", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                router.push(`/projects/${formData.projectId}`);
            } else {
                alert(data.error || "エピックの作成に失敗しました");
            }
        } catch (error) {
            console.error("Failed to create epic:", error);
            alert("エピックの作成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const selectedProject = projects.find((p) => p.id === formData.projectId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white mb-4"
                >
                    ← 戻る
                </Button>

                <Card className="bg-white/5 border-white/10 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            📌 新規エピック作成
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="projectId" className="text-white">
                                    プロジェクト <span className="text-red-400">*</span>
                                </Label>
                                <select
                                    id="projectId"
                                    value={formData.projectId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, projectId: e.target.value })
                                    }
                                    className="w-full p-2 rounded-md bg-white/10 border border-white/20 text-white"
                                    required
                                >
                                    <option value="" className="bg-slate-800">プロジェクトを選択</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id} className="bg-slate-800">
                                            {project.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-white">
                                    エピック名 <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    placeholder="例: ユーザー認証機能"
                                    className="bg-white/10 border-white/20 text-white"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-white">
                                    説明
                                </Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="エピックの概要を入力してください"
                                    className="bg-white/10 border-white/20 text-white min-h-[100px]"
                                />
                            </div>

                            {selectedProject && (
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                                    <p className="text-sm text-gray-400">
                                        📁 <span className="text-purple-300">{selectedProject.title}</span> 内にエピックを作成します
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !formData.title || !formData.projectId}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                    {loading ? "作成中..." : "エピックを作成"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
