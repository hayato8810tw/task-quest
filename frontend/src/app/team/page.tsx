"use client";
import { API_BASE_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TeamMember {
    id: string;
    employee_id: string;
    display_name: string;
    department: string;
    level: number;
    role: string;
}

interface TeamTask {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    deadline: string | null;
    base_points: number;
    bonus_xp: number;
    assigned_to: Array<{ id: string; display_name: string; department: string }>;
}

interface TeamStats {
    member_count: number;
    tasks_pending: number;
    tasks_in_progress: number;
    tasks_completed: number;
    department: string;
}

export default function TeamPage() {
    const router = useRouter();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [tasks, setTasks] = useState<TeamTask[]>([]);
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: "all", assignee: "all" });
    const [userRole, setUserRole] = useState<string>("");
    const [sortBy, setSortBy] = useState("priority");

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token) {
            router.push("/login");
            return;
        }

        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (user.role !== "MANAGER" && user.role !== "ADMIN") {
                router.push("/dashboard");
                return;
            }
        }

        const fetchData = async () => {
            try {
                const [membersRes, tasksRes, statsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/team/members`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${API_BASE_URL}/team/tasks`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${API_BASE_URL}/team/stats`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                const [membersData, tasksData, statsData] = await Promise.all([
                    membersRes.json(),
                    tasksRes.json(),
                    statsRes.json(),
                ]);

                if (membersData.success) setMembers(membersData.data);
                if (tasksData.success) setTasks(tasksData.data);
                if (statsData.success) setStats(statsData.data);
            } catch (error) {
                console.error("Failed to fetch team data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const filteredTasks = tasks.filter((task) => {
        if (filter.status !== "all" && task.status !== filter.status) return false;
        if (filter.assignee !== "all") {
            if (!task.assigned_to.some((a) => a.id === filter.assignee)) return false;
        }
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

    const statusLabels: Record<string, string> = {
        PENDING: "未着手",
        IN_PROGRESS: "進行中",
        COMPLETED: "完了",
    };

    const statusColors: Record<string, string> = {
        PENDING: "bg-gray-500/20 text-gray-300",
        IN_PROGRESS: "bg-blue-500/20 text-blue-300",
        COMPLETED: "bg-green-500/20 text-green-300",
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
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            👥 チーム管理
                        </h2>
                        {stats?.department && (
                            <p className="text-gray-400">{stats.department}部門</p>
                        )}
                    </div>
                    <Button
                        onClick={() => router.push("/tasks/new")}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                        + タスク作成
                    </Button>
                </div>

                {/* 統計 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="pt-4 text-center">
                            <div className="text-3xl font-bold text-white">{stats?.member_count || 0}</div>
                            <p className="text-gray-400 text-sm">メンバー</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="pt-4 text-center">
                            <div className="text-3xl font-bold text-yellow-400">{stats?.tasks_pending || 0}</div>
                            <p className="text-gray-400 text-sm">未着手</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="pt-4 text-center">
                            <div className="text-3xl font-bold text-blue-400">{stats?.tasks_in_progress || 0}</div>
                            <p className="text-gray-400 text-sm">進行中</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="pt-4 text-center">
                            <div className="text-3xl font-bold text-green-400">{stats?.tasks_completed || 0}</div>
                            <p className="text-gray-400 text-sm">完了</p>
                        </CardContent>
                    </Card>
                </div>

                {/* メンバー一覧 */}
                <Card className="bg-white/5 border-white/10 backdrop-blur mb-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-lg">メンバー一覧</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-purple-600 text-white text-sm">
                                            {member.display_name?.charAt(0) || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-white text-sm font-medium">{member.display_name}</p>
                                        <p className="text-gray-400 text-xs">Lv.{member.level}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* フィルター */}
                <Card className="bg-white/5 border-white/10 backdrop-blur mb-6">
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-4">
                            <Select
                                value={filter.status}
                                onValueChange={(value) => setFilter({ ...filter, status: value })}
                            >
                                <SelectTrigger className="w-[150px] bg-white/10 border-white/20 text-white">
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
                                value={filter.assignee}
                                onValueChange={(value) => setFilter({ ...filter, assignee: value })}
                            >
                                <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
                                    <SelectValue placeholder="担当者" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10">
                                    <SelectItem value="all">全員</SelectItem>
                                    {members.map((member) => (
                                        <SelectItem key={member.id} value={member.id}>
                                            {member.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={sortBy}
                                onValueChange={setSortBy}
                            >
                                <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                                    <SelectValue placeholder="並び替え" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="priority">🔥 優先度順</SelectItem>
                                    <SelectItem value="status">📊 ステータス順</SelectItem>
                                    <SelectItem value="points">🎯 ポイント順</SelectItem>
                                    <SelectItem value="deadline">📅 期限順</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* タスク一覧 */}
                <Card className="bg-white/5 border-white/10 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white">
                            チームタスク一覧（{sortedTasks.length}件）
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sortedTasks.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">タスクがありません</p>
                        ) : (
                            <div className="space-y-3">
                                {sortedTasks.map((task) => {
                                    const borderColor = task.status === "IN_PROGRESS"
                                        ? "border-l-4 border-l-blue-500"
                                        : task.status === "COMPLETED"
                                            ? "border-l-4 border-l-green-500"
                                            : "";

                                    return (
                                        <div
                                            key={task.id}
                                            className={`p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ${borderColor}`}
                                        >
                                            {task.status === "IN_PROGRESS" && (
                                                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                                    <span className="animate-pulse">🔵</span>
                                                    <span className="text-blue-300 font-medium">進行中</span>
                                                </div>
                                            )}
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        <Badge className={priorityColors[task.priority]}>
                                                            {priorityLabels[task.priority] || task.priority}
                                                        </Badge>
                                                        <Badge className={statusColors[task.status]}>
                                                            {statusLabels[task.status]}
                                                        </Badge>
                                                        <h3 className="text-white font-medium">{task.title}</h3>
                                                    </div>
                                                    <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm">
                                                        <span className="text-gray-300">
                                                            👤 {task.assigned_to.map((a) => a.display_name).join(", ") || "未割当"}
                                                        </span>
                                                        <span className="text-yellow-400">🎯 +{task.base_points} pt</span>
                                                        {task.deadline && (
                                                            <span className="text-gray-300">
                                                                📅 {new Date(task.deadline).toLocaleDateString("ja-JP")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
