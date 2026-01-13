"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getTasks, completeTask, Task, API_BASE_URL } from "@/lib/api";

interface Project {
    id: string;
    title: string;
}

interface Epic {
    id: string;
    title: string;
    projectId: string;
}

export default function TasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: "all", priority: "all" });
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("status");

    // 配属先変更用
    const [projects, setProjects] = useState<Project[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [selectedEpicId, setSelectedEpicId] = useState<string>("");
    const [saving, setSaving] = useState(false);

    const fetchTasksData = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const result = await getTasks(token);
        if (result.success && result.data) {
            setTasks(result.data);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        // プロジェクトとエピックも取得
        Promise.all([
            fetchTasksData(),
            fetch("http://localhost:3001/api/projects", {
                headers: { Authorization: `Bearer ${token}` },
            }).then(res => res.json()),
            fetch("http://localhost:3001/api/epics", {
                headers: { Authorization: `Bearer ${token}` },
            }).then(res => res.json()),
        ]).then(([_, projectsData, epicsData]) => {
            if (projectsData.success) setProjects(projectsData.data);
            if (epicsData.success) {
                // APIは project_id を返すので projectId にマッピング
                setEpics(epicsData.data.map((e: any) => ({
                    id: e.id,
                    title: e.title,
                    projectId: e.project_id
                })));
            }
            setLoading(false);
        });
    }, [router]);

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        // 完了の場合はポイント付与のためcompleteTaskを使用
        if (newStatus === "COMPLETED") {
            const result = await completeTask(token, taskId);
            if (result.success) {
                fetchTasksData();
            }
        } else {
            // それ以外はステータス更新API
            try {
                const res = await fetch(`http://localhost:3001/api/tasks/${taskId}/status`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status: newStatus }),
                });
                const result = await res.json();
                if (result.success) {
                    fetchTasksData();
                }
            } catch (error) {
                console.error("Failed to update status:", error);
            }
        }
    };

    const handleResetTask = async (taskId: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        if (!confirm("このタスクを未着手に戻しますか？\n完了時に付与されたポイントは取り消されます。")) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:3001/api/tasks/${taskId}/reset`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const result = await res.json();
            if (result.success) {
                fetchTasksData();
                alert(`タスクをリセットしました。\n取り消しポイント: ${result.data.points_revoked} pt`);
            } else {
                alert(result.error || "リセットに失敗しました");
            }
        } catch (error) {
            console.error("Failed to reset task:", error);
        }
    };

    // 配属先変更モーダルを開く
    const openEpicModal = (task: Task) => {
        setEditingTask(task);
        // 現在のエピックからプロジェクトを特定
        const currentEpic = epics.find(e => e.id === task.epicId);
        if (currentEpic) {
            setSelectedProjectId(currentEpic.projectId);
            setSelectedEpicId(currentEpic.id);
        } else {
            setSelectedProjectId("");
            setSelectedEpicId("");
        }
    };

    // 配属先変更を保存
    const handleSaveEpic = async () => {
        if (!editingTask) return;
        const token = localStorage.getItem("token");
        if (!token) return;

        setSaving(true);
        try {
            const res = await fetch(`http://localhost:3001/api/tasks/${editingTask.id}/epic`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    epicId: selectedEpicId && selectedEpicId !== "none" ? selectedEpicId : null
                }),
            });
            const result = await res.json();
            if (result.success) {
                await fetchTasksData();
                setEditingTask(null);
            } else {
                alert(result.error || "変更に失敗しました");
            }
        } catch (error) {
            console.error("Failed to update epic:", error);
            alert("変更に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    // 選択されたプロジェクトのエピックをフィルタ
    const filteredEpics = selectedProjectId && selectedProjectId !== "none"
        ? epics.filter(e => e.projectId === selectedProjectId)
        : [];

    const filteredTasks = tasks.filter((task) => {
        if (filter.status !== "all" && task.status !== filter.status) return false;
        if (filter.priority !== "all" && task.priority !== filter.priority) return false;
        if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // ソート処理
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        switch (sortBy) {
            case "priority":
                const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
            case "points":
                return b.base_points - a.base_points;
            case "deadline":
                if (!a.deadline && !b.deadline) return 0;
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            case "status":
                const statusOrder: Record<string, number> = { IN_PROGRESS: 0, PENDING: 1, COMPLETED: 2 };
                return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
            default:
                return 0;
        }
    });

    const priorityColors: Record<string, string> = {
        HIGH: "bg-red-500/20 text-red-300 border-red-500/30",
        MEDIUM: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        LOW: "bg-green-500/20 text-green-300 border-green-500/30",
        URGENT: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    };

    const priorityLabels: Record<string, string> = {
        HIGH: "高",
        MEDIUM: "中",
        LOW: "低",
        URGENT: "緊急",
    };

    const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
        PENDING: { label: "未着手", color: "bg-gray-500/20 text-gray-300", icon: "🔘" },
        IN_PROGRESS: { label: "進行中", color: "bg-blue-500/20 text-blue-300", icon: "🔵" },
        COMPLETED: { label: "完了", color: "bg-green-500/20 text-green-300", icon: "✅" },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Navbar />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-white text-xl">読み込み中...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">📋 マイタスク</h2>
                    <Button
                        onClick={() => router.push("/tasks/new")}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                        + 新規タスク
                    </Button>
                </div>

                {/* フィルターとソート */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <Input
                        placeholder="🔍 タスクを検索..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-white/10 border-white/20 text-white w-64"
                    />
                    <Select
                        value={filter.status}
                        onValueChange={(value) => setFilter({ ...filter, status: value })}
                    >
                        <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="ステータス" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/10">
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="PENDING">未着手</SelectItem>
                            <SelectItem value="IN_PROGRESS">進行中</SelectItem>
                            <SelectItem value="COMPLETED">完了</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={filter.priority}
                        onValueChange={(value) => setFilter({ ...filter, priority: value })}
                    >
                        <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="優先度" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/10">
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="URGENT">緊急</SelectItem>
                            <SelectItem value="HIGH">高</SelectItem>
                            <SelectItem value="MEDIUM">中</SelectItem>
                            <SelectItem value="LOW">低</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={sortBy}
                        onValueChange={(value) => setSortBy(value)}
                    >
                        <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="並び替え" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/10">
                            <SelectItem value="priority">優先度順</SelectItem>
                            <SelectItem value="status">ステータス順</SelectItem>
                            <SelectItem value="points">ポイント順</SelectItem>
                            <SelectItem value="deadline">期限順</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* タスク一覧 */}
                {sortedTasks.length === 0 ? (
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="py-12 text-center">
                            <p className="text-gray-400">タスクがありません</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {sortedTasks.map((task) => {
                            // タスクのエピック情報を取得
                            const taskEpic = epics.find(e => e.id === task.epicId);
                            const taskProject = taskEpic ? projects.find(p => p.id === taskEpic.projectId) : null;

                            // ステータスに応じた背景色
                            const statusBg = task.status === "IN_PROGRESS"
                                ? "bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-500/40"
                                : task.status === "COMPLETED"
                                    ? "bg-gradient-to-br from-gray-900/20 to-gray-800/10 border-gray-500/20"
                                    : "bg-white/5 border-white/10";

                            // 完了済みのタスクは透明度を下げる
                            const completedStyle = task.status === "COMPLETED" ? "opacity-50" : "";

                            // 優先度に応じた左ボーダー
                            const priorityBorder = {
                                URGENT: "border-l-4 border-l-red-500",
                                HIGH: "border-l-4 border-l-orange-500",
                                MEDIUM: "border-l-4 border-l-yellow-500",
                                LOW: "border-l-4 border-l-gray-500"
                            }[task.priority] || "";

                            // 期限判定
                            const isOverdue = task.deadline && new Date(task.deadline) < new Date();
                            const isUrgent = task.deadline && new Date(task.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

                            return (
                                <Card
                                    key={task.id}
                                    className={`${statusBg} ${priorityBorder} ${completedStyle} backdrop-blur hover:scale-[1.02] hover:opacity-100 transition-all duration-200`}
                                >
                                    <CardContent className="p-0">
                                        {/* ヘッダー: プロジェクト/エピック */}
                                        <div className="px-4 py-2 border-b border-white/10 bg-black/20 rounded-t-lg">
                                            {taskProject && taskEpic ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-purple-300 truncate">
                                                        📁 {taskProject.title} / 📌 {taskEpic.title}
                                                    </span>
                                                    <button
                                                        onClick={() => openEpicModal(task)}
                                                        className="text-xs text-gray-500 hover:text-white"
                                                    >
                                                        ✏️
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openEpicModal(task)}
                                                    className="text-xs text-gray-500 hover:text-purple-300"
                                                >
                                                    📁 配属先を設定
                                                </button>
                                            )}
                                        </div>

                                        {/* メインコンテンツ */}
                                        <div className="p-4 space-y-3">
                                            {/* タイトル */}
                                            <h3 className="text-white font-semibold leading-tight line-clamp-2">
                                                {task.title}
                                            </h3>

                                            {/* 説明 */}
                                            {task.description && (
                                                <p className="text-xs text-gray-400 line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}

                                            {/* バッジ行: 優先度・難易度 */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                                                    {priorityLabels[task.priority] || task.priority}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    ⭐ Lv.{task.difficulty}
                                                </span>
                                            </div>

                                            {/* 情報行: ポイント・期限 */}
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-yellow-400 font-medium">
                                                        🎯 {task.base_points}pt
                                                    </span>
                                                    <span className="text-cyan-400">
                                                        ⚡ {task.bonus_xp}XP
                                                    </span>
                                                </div>
                                                {task.deadline && (
                                                    <span className={`${isOverdue ? "text-red-400 font-bold" : isUrgent ? "text-orange-400" : "text-gray-400"}`}>
                                                        📅 {new Date(task.deadline).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                                                        {isOverdue && " ⚠️"}
                                                    </span>
                                                )}
                                            </div>

                                            {/* 担当者 */}
                                            {task.assigned_to && task.assigned_to.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <span>👤</span>
                                                    <span className="truncate">
                                                        {task.assigned_to.map((a: { displayName?: string; display_name?: string }) => a.displayName || a.display_name).join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* フッター: ステータス・アクション */}
                                        <div className="px-4 py-3 border-t border-white/10 bg-black/10 rounded-b-lg">
                                            <div className="flex items-center justify-between">
                                                {/* ステータス表示 */}
                                                <Badge className={`${statusConfig[task.status]?.color} text-xs`}>
                                                    {statusConfig[task.status]?.icon} {statusConfig[task.status]?.label || task.status}
                                                </Badge>

                                                {/* アクションボタン */}
                                                <div className="flex items-center gap-2">
                                                    {task.status === "PENDING" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStatusChange(task.id, "IN_PROGRESS")}
                                                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            ▶ 開始
                                                        </Button>
                                                    )}
                                                    {task.status === "IN_PROGRESS" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStatusChange(task.id, "COMPLETED")}
                                                            className="h-7 text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                                        >
                                                            ✓ 完了
                                                        </Button>
                                                    )}
                                                    {task.status === "COMPLETED" && (
                                                        <button
                                                            onClick={() => handleResetTask(task.id)}
                                                            className="text-xs text-gray-400 hover:text-white"
                                                        >
                                                            🔄 リセット
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )
                }
            </main >

            {/* 配属先変更モーダル */}
            < Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
                <DialogContent className="bg-slate-800 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>配属先を変更</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <p className="text-sm text-gray-400">
                            タスク: <span className="text-white">{editingTask?.title}</span>
                        </p>

                        <div className="space-y-2">
                            <Label className="text-gray-200">プロジェクト</Label>
                            <Select
                                value={selectedProjectId}
                                onValueChange={(value) => {
                                    setSelectedProjectId(value);
                                    setSelectedEpicId("");
                                }}
                            >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue placeholder="選択なし" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10">
                                    <SelectItem value="none">選択なし</SelectItem>
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
                                value={selectedEpicId}
                                onValueChange={setSelectedEpicId}
                                disabled={!selectedProjectId || selectedProjectId === "none"}
                            >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue placeholder="選択なし" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10">
                                    <SelectItem value="none">選択なし</SelectItem>
                                    {filteredEpics.map((epic) => (
                                        <SelectItem key={epic.id} value={epic.id}>
                                            📌 {epic.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setEditingTask(null)}
                                className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleSaveEpic}
                                disabled={saving}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                {saving ? "保存中..." : "保存"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >
        </div >
    );
}
