"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    base_points: number;
    bonus_xp: number;
    difficulty: number;
    deadline: string | null;
    assigned_to: Array<{ id: string; display_name: string; department: string }>;
}

interface Epic {
    id: string;
    title: string;
    description: string;
    status: string;
    creator_name: string;
    tasks: Task[];
    total_tasks: number;
    completed_tasks: number;
    progress: number;
}

interface Project {
    id: string;
    title: string;
    description: string;
    status: string;
    creator_name: string;
    epics: Epic[];
    total_tasks: number;
    completed_tasks: number;
    progress: number;
    created_at: string;
}

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
    const [userRole, setUserRole] = useState<string>("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role || "");
        }

        const fetchProject = async () => {
            try {
                const res = await fetch(`http://localhost:3001/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                    setProject(data.data);
                    // 最初は全てのエピックを展開
                    setExpandedEpics(new Set(data.data.epics.map((e: Epic) => e.id)));
                }
            } catch (error) {
                console.error("Failed to fetch project:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [router, projectId]);

    const toggleEpic = (epicId: string) => {
        const newExpanded = new Set(expandedEpics);
        if (newExpanded.has(epicId)) {
            newExpanded.delete(epicId);
        } else {
            newExpanded.add(epicId);
        }
        setExpandedEpics(newExpanded);
    };

    // タスクステータス変更
    const handleTaskStatusChange = async (taskId: string, newStatus: string, epicId: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`http://localhost:3001/api/tasks/${taskId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                // ローカルでステータスを更新
                setProject(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        epics: prev.epics.map(epic => {
                            if (epic.id === epicId) {
                                return {
                                    ...epic,
                                    tasks: epic.tasks.map(task =>
                                        task.id === taskId ? { ...task, status: newStatus } : task
                                    ),
                                    completed_tasks: epic.tasks.filter(t =>
                                        t.id === taskId ? newStatus === "COMPLETED" : t.status === "COMPLETED"
                                    ).length,
                                    progress: Math.round(
                                        (epic.tasks.filter(t =>
                                            t.id === taskId ? newStatus === "COMPLETED" : t.status === "COMPLETED"
                                        ).length / epic.total_tasks) * 100
                                    )
                                };
                            }
                            return epic;
                        }),
                    };
                });
            } else {
                alert(data.error || "ステータスの更新に失敗しました");
            }
        } catch {
            alert("ステータスの更新に失敗しました");
        }
    };

    const priorityColors: Record<string, string> = {
        HIGH: "bg-red-500/20 text-red-300",
        MEDIUM: "bg-yellow-500/20 text-yellow-300",
        LOW: "bg-green-500/20 text-green-300",
        URGENT: "bg-purple-500/20 text-purple-300",
    };

    const priorityLabels: Record<string, string> = {
        HIGH: "高",
        MEDIUM: "中",
        LOW: "低",
        URGENT: "緊急",
    };

    const statusColors: Record<string, string> = {
        PENDING: "bg-gray-500/20 text-gray-300",
        IN_PROGRESS: "bg-blue-500/20 text-blue-300",
        COMPLETED: "bg-green-500/20 text-green-300",
    };

    const statusLabels: Record<string, string> = {
        PENDING: "未着手",
        IN_PROGRESS: "進行中",
        COMPLETED: "完了",
    };

    const isManager = userRole === "MANAGER" || userRole === "ADMIN";

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

    if (!project) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                    <p className="text-gray-400">プロジェクトが見つかりません</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                {/* ヘッダー */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/projects")}
                        className="text-gray-400 hover:text-white mb-2"
                    >
                        ← プロジェクト一覧に戻る
                    </Button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                📁 {project.title}
                            </h2>
                            <p className="text-gray-400 mt-1">{project.description}</p>
                        </div>
                        {isManager && (
                            <Button
                                onClick={() => router.push(`/epics/new?projectId=${projectId}`)}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                + エピック追加
                            </Button>
                        )}
                    </div>

                    {/* 進捗概要 */}
                    <Card className="bg-white/5 border-white/10 backdrop-blur mt-4">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm text-gray-300 mb-1">
                                        <span>全体進捗</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                    <Progress value={project.progress} className="h-3 bg-blue-900/50" indicatorClassName="bg-gradient-to-r from-blue-500 to-cyan-400" />
                                </div>
                                <div className="text-center px-4 border-l border-white/10">
                                    <div className="text-2xl font-bold text-purple-400">
                                        {project.epics.length}
                                    </div>
                                    <div className="text-xs text-gray-400">エピック</div>
                                </div>
                                <div className="text-center px-4 border-l border-white/10">
                                    <div className="text-2xl font-bold text-green-400">
                                        {project.completed_tasks}/{project.total_tasks}
                                    </div>
                                    <div className="text-xs text-gray-400">タスク完了</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* エピック一覧 */}
                <div className="space-y-4">
                    {project.epics.length === 0 ? (
                        <Card className="bg-white/5 border-white/10 backdrop-blur">
                            <CardContent className="py-8 text-center">
                                <p className="text-gray-400 mb-4">エピックがありません</p>
                                {isManager && (
                                    <Button
                                        onClick={() => router.push(`/epics/new?projectId=${projectId}`)}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        最初のエピックを作成
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        project.epics.map((epic) => (
                            <Card key={epic.id} className="bg-white/5 border-white/10 backdrop-blur">
                                <CardHeader
                                    className="cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => toggleEpic(epic.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">
                                                {expandedEpics.has(epic.id) ? "📂" : "📌"}
                                            </span>
                                            <CardTitle className="text-white">{epic.title}</CardTitle>
                                            <Badge className="bg-purple-500/20 text-purple-300">
                                                {epic.total_tasks} タスク
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm text-gray-400">
                                                {epic.progress}% 完了
                                            </div>
                                            <Progress value={epic.progress} className="w-24 h-2 bg-blue-900/50" indicatorClassName="bg-gradient-to-r from-blue-500 to-cyan-400" />
                                        </div>
                                    </div>
                                    {epic.description && (
                                        <p className="text-sm text-gray-400 ml-8">{epic.description}</p>
                                    )}
                                </CardHeader>

                                {expandedEpics.has(epic.id) && (
                                    <CardContent className="pt-0">
                                        <div className="ml-8 space-y-2">
                                            {epic.tasks.length === 0 ? (
                                                <p className="text-gray-500 text-sm py-2">タスクがありません</p>
                                            ) : (
                                                [...epic.tasks].sort((a, b) => {
                                                    const statusOrder: Record<string, number> = { IN_PROGRESS: 0, PENDING: 1, COMPLETED: 2 };
                                                    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
                                                }).map((task) => {
                                                    const borderColor =
                                                        task.status === "IN_PROGRESS"
                                                            ? "border-l-blue-500"
                                                            : task.status === "COMPLETED"
                                                                ? "border-l-gray-500"
                                                                : "border-l-transparent";

                                                    const completedStyle = task.status === "COMPLETED" ? "opacity-50 hover:opacity-100" : "";

                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className={`p-3 rounded-lg bg-white/5 border border-white/10 border-l-4 ${borderColor} ${completedStyle} transition-opacity duration-200`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span>✅</span>
                                                                    <span className="text-white">{task.title}</span>
                                                                    <Badge className={priorityColors[task.priority]}>
                                                                        {priorityLabels[task.priority] || task.priority}
                                                                    </Badge>
                                                                    <Select
                                                                        value={task.status}
                                                                        onValueChange={(value) => handleTaskStatusChange(task.id, value, epic.id)}
                                                                    >
                                                                        <SelectTrigger className={`w-28 h-7 text-xs ${statusColors[task.status]} border-0`}>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-slate-800 border-white/10">
                                                                            <SelectItem value="PENDING">🔘 未着手</SelectItem>
                                                                            <SelectItem value="IN_PROGRESS">🔵 進行中</SelectItem>
                                                                            <SelectItem value="COMPLETED">✅ 完了</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                                                    <span>🎯 {task.base_points} pt</span>
                                                                    {task.assigned_to.length > 0 && (
                                                                        <span>
                                                                            👤 {task.assigned_to.map(a => a.display_name).join(", ")}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            {isManager && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/tasks/new?epicId=${epic.id}`)}
                                                    className="text-purple-400 hover:text-purple-300"
                                                >
                                                    + タスクを追加
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
