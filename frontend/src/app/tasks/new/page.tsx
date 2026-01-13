"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { API_BASE_URL } from "@/lib/api";

interface SimpleUser {
    id: string;
    display_name: string;
}

interface Project {
    id: string;
    title: string;
}

interface Epic {
    id: string;
    title: string;
    project_id: string;
}

export default function NewTaskPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const epicIdParam = searchParams.get("epicId");
    const projectIdParam = searchParams.get("projectId");

    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<SimpleUser[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || "");

    // 新規追加モーダル用ステート
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showNewEpicModal, setShowNewEpicModal] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [newEpicTitle, setNewEpicTitle] = useState("");
    const [creatingProject, setCreatingProject] = useState(false);
    const [creatingEpic, setCreatingEpic] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "MEDIUM",
        difficulty: "3",
        base_points: "100",
        bonus_xp: "50",
        deadline: "",
        assigned_to: [] as string[],
        epicId: epicIdParam || "",
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        // 並列でデータ取得
        Promise.all([
            fetch("http://localhost:3001/api/users", {
                headers: { Authorization: `Bearer ${ token }` },
            }).then(res => res.json()),
            fetch(`${ API_BASE_URL } / projects", {
                headers: { Authorization: `Bearer ${token}` },
            }).then(res => res.json()),
        fetch("http://localhost:3001/api/epics", {
                headers: { Authorization: `Bearer ${ token }` },
            }).then(res => res.json()),
        ]).then(([usersData, projectsData, epicsData]) => {
            if (usersData.success) {
                setUsers(usersData.data.map((u: any) => ({
                    id: u.id,
                    display_name: u.displayName || u.display_name
                })));
            }
            if (projectsData.success) {
                setProjects(projectsData.data);
            }
            if (epicsData.success) {
                setEpics(epicsData.data);
                // epicIdParamからプロジェクトを特定
                if (epicIdParam) {
                    const epic = epicsData.data.find((e: Epic) => e.id === epicIdParam);
                    if (epic) {
                        setSelectedProjectId(epic.project_id);
                    }
                }
            }
        }).catch(console.error);
    }, [router, epicIdParam]);

    // 選択されたプロジェクトのエピックをフィルタ
    const filteredEpics = selectedProjectId
        ? epics.filter(e => e.project_id === selectedProjectId)
        : epics;

    const handleProjectChange = (projectId: string) => {
        if (projectId === "new") {
            setShowNewProjectModal(true);
            return;
        }
        setSelectedProjectId(projectId);
        // プロジェクト変更時はエピックをリセット
        if (formData.epicId) {
            const currentEpic = epics.find(e => e.id === formData.epicId);
            if (currentEpic && currentEpic.project_id !== projectId) {
                setFormData({ ...formData, epicId: "" });
            }
        }
    };

    const handleEpicChange = (epicId: string) => {
        if (epicId === "new") {
            setShowNewEpicModal(true);
            return;
        }
        setFormData({ ...formData, epicId: epicId === "none" ? "" : epicId });
    };

    // 新規プロジェクト作成
    const handleCreateProject = async () => {
        const token = localStorage.getItem("token");
        if (!token || !newProjectTitle.trim()) return;

        setCreatingProject(true);
        try {
            const res = await fetch(`${ API_BASE_URL } / projects", {
                method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
            body: JSON.stringify({ title: newProjectTitle.trim() }),
            });
const data = await res.json();
if (data.success) {
    const newProject = data.data;
    setProjects([...projects, { id: newProject.id, title: newProject.title }]);
    setSelectedProjectId(newProject.id);
    setNewProjectTitle("");
    setShowNewProjectModal(false);
} else {
    alert(data.error || "プロジェクトの作成に失敗しました");
}
        } catch {
    alert("プロジェクトの作成に失敗しました");
} finally {
    setCreatingProject(false);
}
    };

// 新規エピック作成
const handleCreateEpic = async () => {
    const token = localStorage.getItem("token");
    if (!token || !newEpicTitle.trim() || !selectedProjectId || selectedProjectId === "none") return;

    setCreatingEpic(true);
    try {
        const res = await fetch("http://localhost:3001/api/epics", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ token }`,
                },
                body: JSON.stringify({
                    title: newEpicTitle.trim(),
                    projectId: selectedProjectId
                }),
            });
            const data = await res.json();
            if (data.success) {
                const newEpic = data.data;
                setEpics([...epics, { id: newEpic.id, title: newEpic.title, project_id: newEpic.projectId || newEpic.project_id }]);
                setFormData({ ...formData, epicId: newEpic.id });
                setNewEpicTitle("");
                setShowNewEpicModal(false);
            } else {
                alert(data.error || "エピックの作成に失敗しました");
            }
        } catch {
            alert("エピックの作成に失敗しました");
        } finally {
            setCreatingEpic(false);
        }
    };

    // AI推奨値計算（Gemini API）
    const [aiLoading, setAiLoading] = useState(false);
    const [aiReasoning, setAiReasoning] = useState("");

    const calculateAiRecommendedValues = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("ログインが必要です");
            return;
        }

        if (!formData.title) {
            alert("タスク名を入力してください");
            return;
        }

        setAiLoading(true);
        setAiReasoning("");
        console.log("Calling AI API...");

        try {
            const res = await fetch(`${ API_BASE_URL } / ai / suggest - points", {
                method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
            body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                difficulty: formData.difficulty,
                deadline: formData.deadline,
            }),
            });

    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Response data:", data);

    if (data.success) {
        setFormData({
            ...formData,
            base_points: String(data.data.base_points),
            bonus_xp: String(data.data.bonus_xp),
        });
        setAiReasoning(data.data.reasoning || "");
    } else {
        alert(data.error || "AI推奨値の取得に失敗しました");
    }
} catch (error: any) {
    console.error("AI API Error:", error);
    alert(`AI推奨値の取得に失敗しました: ${error?.message || 'Unknown error'}`);
} finally {
    setAiLoading(false);
}
    };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch("http://localhost:3001/api/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ token }`,
                },
                body: JSON.stringify({
                    ...formData,
                    difficulty: parseInt(formData.difficulty),
                    base_points: parseInt(formData.base_points),
                    bonus_xp: parseInt(formData.bonus_xp),
                    epicId: formData.epicId || null,
                }),
            });

            const result = await res.json();
            if (result.success) {
                // エピックが選択されていればプロジェクト詳細へ、それ以外はタスク一覧へ
                if (formData.epicId) {
                    router.push(`/ projects / ${ selectedProjectId }`);
                } else {
                    router.push("/tasks");
                }
            } else {
                alert(result.error || "タスクの作成に失敗しました");
            }
        } catch (error) {
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <Card className="bg-white/5 border-white/10 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            ✨ 新規タスク作成
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* プロジェクト・エピック選択 */}
                            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-4">
                                <h3 className="text-purple-300 font-medium">📁 所属先（任意）</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-200">プロジェクト</Label>
                                        <Select
                                            value={selectedProjectId}
                                            onValueChange={handleProjectChange}
                                        >
                                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                <SelectValue placeholder="選択なし" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-white/10">
                                                <SelectItem value="none">選択なし</SelectItem>
                                                <SelectItem value="new" className="text-green-400">➕ 新規プロジェクト作成</SelectItem>
                                                {projects.map((project) => (
                                                    <SelectItem key={project.id} value={project.id}>
                                                        📁 {project.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-gray-200">エピック</Label>
                                        <Select
                                            value={formData.epicId}
                                            onValueChange={handleEpicChange}
                                            disabled={!selectedProjectId || selectedProjectId === "none"}
                                        >
                                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                <SelectValue placeholder="選択なし" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-white/10">
                                                <SelectItem value="none">選択なし</SelectItem>
                                                <SelectItem value="new" className="text-green-400">➕ 新規エピック作成</SelectItem>
                                                {filteredEpics.map((epic) => (
                                                    <SelectItem key={epic.id} value={epic.id}>
                                                        📌 {epic.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {selectedProjectId && selectedProjectId !== "none" && (
                                    <p className="text-xs text-gray-400">
                                        💡 エピックを選択すると、プロジェクト階層に紐づけられます
                                    </p>
                                )}
                            </div>

                            {/* タイトル */}
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-gray-200">タスク名 *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="タスクのタイトルを入力"
                                    className="bg-white/10 border-white/20 text-white"
                                    required
                                />
                            </div>

                            {/* 説明 */}
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-gray-200">説明</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="タスクの詳細説明"
                                    className="bg-white/10 border-white/20 text-white min-h-[100px]"
                                />
                            </div>

                            {/* 優先度・難易度 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-200">優先度</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                    >
                                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-white/10">
                                            <SelectItem value="LOW">🟢 低</SelectItem>
                                            <SelectItem value="MEDIUM">🟡 中</SelectItem>
                                            <SelectItem value="HIGH">🔴 高</SelectItem>
                                            <SelectItem value="URGENT">🟣 緊急</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-200">難易度 (1-5)</Label>
                                    <Select
                                        value={formData.difficulty}
                                        onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                                    >
                                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-white/10">
                                            <SelectItem value="1">⭐ 1 - とても簡単</SelectItem>
                                            <SelectItem value="2">⭐⭐ 2 - 簡単</SelectItem>
                                            <SelectItem value="3">⭐⭐⭐ 3 - 普通</SelectItem>
                                            <SelectItem value="4">⭐⭐⭐⭐ 4 - 難しい</SelectItem>
                                            <SelectItem value="5">⭐⭐⭐⭐⭐ 5 - とても難しい</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* ポイント・XP */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <Label className="text-gray-200">ポイント / XP</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={calculateAiRecommendedValues}
                                        disabled={aiLoading}
                                        className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-cyan-300 border-cyan-500/30 hover:from-blue-600/30 hover:to-cyan-600/30"
                                    >
                                        {aiLoading ? "⏳ 分析中..." : "🤖 AI推奨"}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400">
                                    ※ AI推奨はタスク名・説明を分析して最適な値を提案します
                                </p>
                                {aiReasoning && (
                                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                                        <p className="text-cyan-300 text-sm">🤖 AI判定: {aiReasoning}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="base_points" className="text-gray-200">基礎ポイント</Label>
                                        <Input
                                            id="base_points"
                                            type="number"
                                            value={formData.base_points}
                                            onChange={(e) => setFormData({ ...formData, base_points: e.target.value })}
                                            className="bg-white/10 border-white/20 text-white"
                                            min="0"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bonus_xp" className="text-gray-200">ボーナスXP</Label>
                                        <Input
                                            id="bonus_xp"
                                            type="number"
                                            value={formData.bonus_xp}
                                            onChange={(e) => setFormData({ ...formData, bonus_xp: e.target.value })}
                                            className="bg-white/10 border-white/20 text-white"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 期限 */}
                            <div className="space-y-2">
                                <Label htmlFor="deadline" className="text-gray-200">期限</Label>
                                <Input
                                    id="deadline"
                                    type="datetime-local"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>

                            {/* 担当者選択 */}
                            <div className="space-y-2">
                                <Label className="text-gray-200">担当者 <span className="text-red-400">*</span></Label>
                                <Select
                                    value={formData.assigned_to[0] || ""}
                                    onValueChange={(value) => setFormData({ ...formData, assigned_to: [value] })}
                                >
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue placeholder="担当者を選択" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-white/10">
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* ボタン */}
                            <div className="flex gap-4 pt-4">
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
                                    disabled={loading || !formData.title || formData.assigned_to.length === 0}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                    {loading ? "作成中..." : "タスクを作成"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>

            {/* 新規プロジェクト作成モーダル */}
            {showNewProjectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 border border-white/10">
                        <h3 className="text-xl font-bold text-white mb-4">📁 新規プロジェクト作成</h3>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-gray-200">プロジェクト名 *</Label>
                                <Input
                                    value={newProjectTitle}
                                    onChange={(e) => setNewProjectTitle(e.target.value)}
                                    placeholder="プロジェクト名を入力"
                                    className="bg-white/10 border-white/20 text-white mt-1"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowNewProjectModal(false);
                                        setNewProjectTitle("");
                                    }}
                                    className="flex-1 bg-slate-700 text-white border-slate-600"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={handleCreateProject}
                                    disabled={creatingProject || !newProjectTitle.trim()}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {creatingProject ? "作成中..." : "作成"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 新規エピック作成モーダル */}
            {showNewEpicModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 border border-white/10">
                        <h3 className="text-xl font-bold text-white mb-4">📌 新規エピック作成</h3>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-gray-200">エピック名 *</Label>
                                <Input
                                    value={newEpicTitle}
                                    onChange={(e) => setNewEpicTitle(e.target.value)}
                                    placeholder="エピック名を入力"
                                    className="bg-white/10 border-white/20 text-white mt-1"
                                    autoFocus
                                />
                            </div>
                            <p className="text-sm text-gray-400">
                                プロジェクト: {projects.find(p => p.id === selectedProjectId)?.title || "不明"}
                            </p>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowNewEpicModal(false);
                                        setNewEpicTitle("");
                                    }}
                                    className="flex-1 bg-slate-700 text-white border-slate-600"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={handleCreateEpic}
                                    disabled={creatingEpic || !newEpicTitle.trim()}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {creatingEpic ? "作成中..." : "作成"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
