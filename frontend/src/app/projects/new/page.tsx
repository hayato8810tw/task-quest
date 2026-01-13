"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewProjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const res = await fetch("http://localhost:3001/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                router.push(`/projects/${data.data.id}`);
            } else {
                alert(data.error || "プロジェクトの作成に失敗しました");
            }
        } catch (error) {
            console.error("Failed to create project:", error);
            alert("プロジェクトの作成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/projects")}
                    className="text-gray-400 hover:text-white mb-4"
                >
                    ← プロジェクト一覧に戻る
                </Button>

                <Card className="bg-white/5 border-white/10 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            📁 新規プロジェクト作成
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-white">
                                    プロジェクト名 <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    placeholder="例: 2026年 製品リニューアルプロジェクト"
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
                                    placeholder="プロジェクトの概要を入力してください"
                                    className="bg-white/10 border-white/20 text-white min-h-[100px]"
                                />
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <h4 className="text-blue-300 font-medium mb-2">💡 階層構造について</h4>
                                <p className="text-sm text-gray-400">
                                    プロジェクト作成後、エピック（機能単位）を追加し、
                                    各エピック内にタスクを作成できます。
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    📁 プロジェクト → 📌 エピック → ✅ タスク
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/projects")}
                                    className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !formData.title}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                    {loading ? "作成中..." : "プロジェクトを作成"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
