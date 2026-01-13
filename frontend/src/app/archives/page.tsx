"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ArchivedTask {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    base_points: number;
    completed_at: string;
    archived_at: string;
    creator_name: string;
    project_name: string | null;
    epic_name: string | null;
    assigned_to: string[];
}

interface ArchivedEpic {
    id: string;
    title: string;
    description: string;
    status: string;
    project_name: string;
    creator_name: string;
    task_count: number;
    completed_count: number;
    archived_at: string;
}

interface ArchivedProject {
    id: string;
    title: string;
    description: string;
    status: string;
    creator_name: string;
    epic_count: number;
    task_count: number;
    completed_count: number;
    archived_at: string;
}

interface ArchiveCandidate {
    id: string;
    title: string;
    completed_at?: string;
    project_name?: string;
    epic_name?: string;
}

export default function ArchivesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"tasks" | "epics" | "projects">("tasks");

    const [archivedTasks, setArchivedTasks] = useState<Record<string, ArchivedTask[]>>({});
    const [archivedEpics, setArchivedEpics] = useState<ArchivedEpic[]>([]);
    const [archivedProjects, setArchivedProjects] = useState<ArchivedProject[]>([]);

    const [candidates, setCandidates] = useState<ArchiveCandidate[]>([]);
    const [showCandidates, setShowCandidates] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
    const [userRole, setUserRole] = useState<string>("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token) {
            router.push("/login");
            return;
        }

        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role || "");
        }

        fetchAll();
    }, [router]);

    const fetchAll = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const [tasksRes, epicsRes, projectsRes] = await Promise.all([
                fetch("http://localhost:3001/api/archives/tasks", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("http://localhost:3001/api/archives/epics", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("http://localhost:3001/api/archives/projects", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const [tasksData, epicsData, projectsData] = await Promise.all([
                tasksRes.json(),
                epicsRes.json(),
                projectsRes.json(),
            ]);

            if (tasksData.success) setArchivedTasks(tasksData.data);
            if (epicsData.success) setArchivedEpics(epicsData.data);
            if (projectsData.success) setArchivedProjects(projectsData.data);
        } catch (error) {
            console.error("Failed to fetch archives:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCandidates = async (type: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`http://localhost:3001/api/archives/candidates/${type}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setCandidates(data.data);
                setShowCandidates(true);
            }
        } catch (error) {
            console.error("Failed to fetch candidates:", error);
        }
    };

    const handleArchive = async (type: string, id: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`http://localhost:3001/api/archives/${type}/${id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                fetchAll();
                setCandidates(candidates.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error("Failed to archive:", error);
        }
    };

    // 一括アーカイブ
    const handleArchiveAll = async () => {
        if (candidates.length === 0) return;
        if (!confirm(`${candidates.length}件のアイテムを一括でアーカイブしますか？`)) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            for (const candidate of candidates) {
                await fetch(`http://localhost:3001/api/archives/${activeTab}/${candidate.id}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
            fetchAll();
            setCandidates([]);
            setShowCandidates(false);
        } catch (error) {
            console.error("Failed to archive all:", error);
        }
    };

    const handleUnarchive = async (type: string, id: string) => {
        if (!confirm("アーカイブを解除しますか？")) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`http://localhost:3001/api/archives/${type}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                fetchAll();
            }
        } catch (error) {
            console.error("Failed to unarchive:", error);
        }
    };

    const toggleMonth = (month: string) => {
        const newSet = new Set(expandedMonths);
        if (newSet.has(month)) {
            newSet.delete(month);
        } else {
            newSet.add(month);
        }
        setExpandedMonths(newSet);
    };

    const priorityColors: Record<string, string> = {
        LOW: "bg-gray-500/20 text-gray-300",
        MEDIUM: "bg-blue-500/20 text-blue-300",
        HIGH: "bg-orange-500/20 text-orange-300",
        URGENT: "bg-red-500/20 text-red-300",
    };

    const taskCount = Object.values(archivedTasks).reduce((sum, arr) => sum + arr.length, 0);
    const epicCount = archivedEpics.length;
    const projectCount = archivedProjects.length;

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
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">📦 アーカイブ管理</h2>
                        <p className="text-gray-400">完了済みのタスク・エピック・プロジェクトを管理</p>
                    </div>
                </div>

                {/* 統計 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-purple-400">{taskCount}</div>
                            <div className="text-gray-400">アーカイブ済みタスク</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-blue-400">{epicCount}</div>
                            <div className="text-gray-400">アーカイブ済みエピック</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-green-400">{projectCount}</div>
                            <div className="text-gray-400">アーカイブ済みプロジェクト</div>
                        </CardContent>
                    </Card>
                </div>

                {/* タブ */}
                <div className="flex gap-2 mb-6">
                    {(["tasks", "epics", "projects"] as const).map(tab => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? "default" : "outline"}
                            onClick={() => { setActiveTab(tab); setShowCandidates(false); }}
                            className={activeTab === tab
                                ? "bg-white text-slate-900"
                                : "bg-purple-600/20 text-purple-300 border-purple-500/30"}
                        >
                            {tab === "tasks" ? "📋 タスク" : tab === "epics" ? "📁 エピック" : "🎯 プロジェクト"}
                        </Button>
                    ))}
                    {userRole === "ADMIN" && (
                        <Button
                            variant="outline"
                            onClick={() => fetchCandidates(activeTab)}
                            className="ml-auto bg-green-600/20 text-green-300 border-green-500/30 hover:bg-green-600/30"
                        >
                            + 完了済みをアーカイブ
                        </Button>
                    )}
                </div>

                {/* アーカイブ候補モーダル */}
                {showCandidates && (
                    <Card className="bg-white/5 border-white/10 backdrop-blur mb-6">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-white">アーカイブ候補</CardTitle>
                                    <span className="text-sm text-gray-400">({candidates.length}件)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {candidates.length > 0 && (
                                        <Button
                                            size="sm"
                                            onClick={handleArchiveAll}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            📦 一括アーカイブ
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowCandidates(false)}
                                        className="text-gray-400"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {candidates.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">完了済みのアイテムがありません</p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {candidates.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                            <div>
                                                <span className="text-white">{c.title}</span>
                                                {c.project_name && (
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        {c.project_name} {c.epic_name && `> ${c.epic_name}`}
                                                    </span>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleArchive(activeTab, c.id)}
                                                className="bg-purple-600 hover:bg-purple-700"
                                            >
                                                アーカイブ
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* タスク一覧（月別） */}
                {activeTab === "tasks" && (
                    <div className="space-y-4">
                        {Object.keys(archivedTasks).length === 0 ? (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-400">アーカイブ済みタスクがありません</p>
                                </CardContent>
                            </Card>
                        ) : (
                            Object.entries(archivedTasks).map(([month, tasks]) => (
                                <Card key={month} className="bg-white/5 border-white/10 backdrop-blur">
                                    <CardHeader
                                        className="cursor-pointer hover:bg-white/5"
                                        onClick={() => toggleMonth(month)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-white flex items-center gap-2">
                                                {expandedMonths.has(month) ? "▼" : "▶"} {month}
                                            </CardTitle>
                                            <Badge className="bg-purple-500/20 text-purple-300">
                                                {tasks.length}件
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    {expandedMonths.has(month) && (
                                        <CardContent className="space-y-2">
                                            {tasks.map(task => (
                                                <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <Badge className={priorityColors[task.priority]}>
                                                            {task.priority}
                                                        </Badge>
                                                        <div>
                                                            <span className="text-white">{task.title}</span>
                                                            {task.project_name && (
                                                                <div className="text-xs text-gray-400">
                                                                    {task.project_name} {task.epic_name && `> ${task.epic_name}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-400">
                                                            {task.base_points} pt
                                                        </span>
                                                        {userRole === "ADMIN" && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleUnarchive("tasks", task.id)}
                                                                className="text-gray-400 hover:text-white"
                                                            >
                                                                📤
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* エピック一覧 */}
                {activeTab === "epics" && (
                    <div className="space-y-4">
                        {archivedEpics.length === 0 ? (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-400">アーカイブ済みエピックがありません</p>
                                </CardContent>
                            </Card>
                        ) : (
                            archivedEpics.map(epic => (
                                <Card key={epic.id} className="bg-white/5 border-white/10 backdrop-blur">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-white font-medium">{epic.title}</h4>
                                            <p className="text-sm text-gray-400">
                                                {epic.project_name} • {epic.completed_count}/{epic.task_count} タスク完了
                                            </p>
                                        </div>
                                        {userRole === "ADMIN" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleUnarchive("epics", epic.id)}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                📤 解除
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* プロジェクト一覧 */}
                {activeTab === "projects" && (
                    <div className="space-y-4">
                        {archivedProjects.length === 0 ? (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-400">アーカイブ済みプロジェクトがありません</p>
                                </CardContent>
                            </Card>
                        ) : (
                            archivedProjects.map(project => (
                                <Card key={project.id} className="bg-white/5 border-white/10 backdrop-blur">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-white font-medium">🎯 {project.title}</h4>
                                            <p className="text-sm text-gray-400">
                                                {project.epic_count} エピック • {project.completed_count}/{project.task_count} タスク完了
                                            </p>
                                        </div>
                                        {userRole === "ADMIN" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleUnarchive("projects", project.id)}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                📤 解除
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
