"use client";

import { useEffect, useState, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMe, getTasks, claimLoginBonus, completeTask, getLoginBonusStatus, User, Task } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api";

const DAYS = [
    { key: "MONDAY", label: "月曜" },
    { key: "TUESDAY", label: "火曜" },
    { key: "WEDNESDAY", label: "水曜" },
    { key: "THURSDAY", label: "木曜" },
    { key: "FRIDAY", label: "金曜" },
];

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [loginBonusClaimed, setLoginBonusClaimed] = useState(false);
    const [draggedTask, setDraggedTask] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const fetchData = async () => {
            try {
                const [userRes, tasksRes, bonusStatusRes] = await Promise.all([
                    getMe(token),
                    getTasks(token),
                    getLoginBonusStatus(token),
                ]);

                if (userRes.success && userRes.data) {
                    setUser(userRes.data);
                    localStorage.setItem("user", JSON.stringify({
                        id: userRes.data.id,
                        display_name: userRes.data.display_name,
                        level: userRes.data.level,
                        available_points: userRes.data.available_points,
                        role: userRes.data.role,
                    }));
                } else {
                    localStorage.removeItem("token");
                    router.push("/login");
                }

                if (tasksRes.success && tasksRes.data) {
                    setTasks(tasksRes.data);
                }

                if (bonusStatusRes.success && bonusStatusRes.data) {
                    setLoginBonusClaimed(bonusStatusRes.data.claimed_today);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleClaimLoginBonus = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const result = await claimLoginBonus(token);
        if (result.success) {
            setLoginBonusClaimed(true);
            const userRes = await getMe(token);
            if (userRes.success && userRes.data) {
                setUser(userRes.data);
            }
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const result = await completeTask(token, taskId);
        if (result.success) {
            const [userRes, tasksRes] = await Promise.all([
                getMe(token),
                getTasks(token),
            ]);
            if (userRes.success && userRes.data) setUser(userRes.data);
            if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
        }
    };

    // ドラッグ開始
    const handleDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
        setDraggedTask(taskId);
        e.dataTransfer.effectAllowed = "move";
    };

    // ドロップ可能領域に入った時
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    // ドロップ時
    const handleDrop = async (e: DragEvent<HTMLDivElement>, day: string | null) => {
        e.preventDefault();
        if (!draggedTask) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/tasks/${draggedTask}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ scheduled_day: day || "" }),
            });
            const data = await res.json();
            if (data.success) {
                // タスク一覧を更新
                setTasks(prev => prev.map(t =>
                    t.id === draggedTask ? { ...t, scheduled_day: day } : t
                ));
            }
        } catch (error) {
            console.error("Failed to update task:", error);
        }
        setDraggedTask(null);
    };

    const getRequiredXp = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
    const xpProgress = user ? (user.current_xp / getRequiredXp(user.level)) * 100 : 0;

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

    const statusColors: Record<string, string> = {
        PENDING: "bg-gray-500",
        IN_PROGRESS: "bg-blue-500",
        COMPLETED: "bg-green-500",
    };

    // 曜日ごとにタスクをグループ化
    const getTasksByDay = (day: string) => {
        return tasks.filter(t => (t as any).scheduled_day === day && t.status !== "COMPLETED");
    };

    // 未割り当てタスク
    const unscheduledTasks = tasks.filter(t => !(t as any).scheduled_day && t.status !== "COMPLETED");

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
                {/* User Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                ⚔️ レベル & XP
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                    Lv.{user?.level}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm text-gray-300">
                                    <span>XP</span>
                                    <span>{user?.current_xp} / {user ? getRequiredXp(user.level) : 0}</span>
                                </div>
                                <Progress
                                    value={xpProgress}
                                    className="h-2 bg-emerald-900/50"
                                    indicatorClassName="bg-gradient-to-r from-emerald-500 to-green-400"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                💰 ポイント
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                                {user?.available_points.toLocaleString()} pt
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                                累計: {user?.total_points.toLocaleString()} pt
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                🔥 ログインストリーク
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                                {user?.login_streak}日連続
                            </div>
                            {loginBonusClaimed ? (
                                <div className="mt-2 px-3 py-2 rounded-lg bg-gray-500/20 text-gray-400 text-sm">
                                    ✓ 本日のボーナス受け取り済み
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={handleClaimLoginBonus}
                                    className="mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                                >
                                    ログインボーナスを受け取る
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* 週間プランナー */}
                <Card className="bg-white/5 border-white/10 backdrop-blur mb-8">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            📅 週間プランナー
                            <span className="text-sm font-normal text-gray-400">
                                （タスクをドラッグして曜日に割り当て）
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 gap-3">
                            {DAYS.map(({ key, label }) => (
                                <div
                                    key={key}
                                    className="min-h-[200px] rounded-lg border border-white/10 bg-white/5 p-2"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, key)}
                                >
                                    <div className="text-center text-white font-medium mb-2 pb-2 border-b border-white/10">
                                        {label}
                                    </div>
                                    <div className="space-y-2">
                                        {getTasksByDay(key).map(task => (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                className={`p-2 rounded bg-white/10 border border-white/20 cursor-move hover:bg-white/20 transition-colors ${draggedTask === task.id ? "opacity-50" : ""
                                                    }`}
                                            >
                                                {/* プロジェクト・エピック */}
                                                {(task as any).epic && (
                                                    <div className="text-[10px] text-purple-300/80 mb-1 truncate">
                                                        📁 {(task as any).epic.project?.title} / {(task as any).epic.title}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 mb-1">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[task.status]}`} />
                                                    <span className="text-white text-sm font-medium truncate">
                                                        {task.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span>+{task.base_points}pt</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 未割り当てタスク（常に表示してドロップゾーンとして機能） */}
                        <div
                            className={`mt-4 p-3 rounded-lg border border-dashed bg-white/5 transition-colors ${draggedTask ? "border-purple-500/50 bg-purple-500/10" : "border-white/20"
                                }`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, null)}
                        >
                            <div className="text-gray-400 text-sm mb-2">
                                📥 未割り当てタスク
                                {draggedTask && <span className="text-purple-400 ml-2">（ここにドロップで曜日を解除）</span>}
                            </div>
                            {unscheduledTasks.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {unscheduledTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            className={`px-3 py-2 rounded bg-white/10 border border-white/20 cursor-move hover:bg-white/20 transition-colors ${draggedTask === task.id ? "opacity-50" : ""
                                                }`}
                                        >
                                            {(task as any).epic && (
                                                <div className="text-[10px] text-purple-300/80 mb-1">
                                                    📁 {(task as any).epic.project?.title} / {(task as any).epic.title}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Badge className={priorityColors[task.priority] + " text-xs"}>
                                                    {priorityLabels[task.priority]}
                                                </Badge>
                                                <span className="text-white text-sm">{task.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm py-2">
                                    すべてのタスクが曜日に割り当てられています
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Tasks */}
                <Card className="bg-white/5 border-white/10 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            📋 あなたのタスク
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tasks.length === 0 ? (
                            <p className="text-gray-400">割り当てられたタスクはありません</p>
                        ) : (
                            <div className="space-y-4">
                                {[...tasks].sort((a, b) => {
                                    const statusOrder: Record<string, number> = { IN_PROGRESS: 0, PENDING: 1, COMPLETED: 2 };
                                    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
                                }).map((task) => {
                                    const statusConfig: Record<string, { label: string; color: string }> = {
                                        PENDING: { label: "未着手", color: "bg-gray-500/20 text-gray-300" },
                                        IN_PROGRESS: { label: "進行中", color: "bg-blue-500/20 text-blue-300" },
                                        COMPLETED: { label: "完了", color: "bg-green-500/20 text-green-300" },
                                    };
                                    const borderColor = task.status === "IN_PROGRESS"
                                        ? "border-l-4 border-l-blue-500"
                                        : task.status === "COMPLETED"
                                            ? "border-l-4 border-l-gray-500"
                                            : "";
                                    const completedStyle = task.status === "COMPLETED" ? "opacity-50 hover:opacity-100" : "";

                                    return (
                                        <div
                                            key={task.id}
                                            className={`p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 ${borderColor} ${completedStyle}`}
                                        >
                                            {task.status === "IN_PROGRESS" && (
                                                <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-blue-500/20">
                                                    <span className="animate-pulse">🔵</span>
                                                    <span className="text-blue-300 text-sm font-medium">進行中</span>
                                                </div>
                                            )}
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge className={priorityColors[task.priority]}>
                                                            {priorityLabels[task.priority] || task.priority}
                                                        </Badge>
                                                        <Badge className={statusConfig[task.status]?.color}>
                                                            {statusConfig[task.status]?.label || task.status}
                                                        </Badge>
                                                        {(task as any).scheduled_day && (
                                                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                                                {DAYS.find(d => d.key === (task as any).scheduled_day)?.label}
                                                            </Badge>
                                                        )}
                                                        <h3 className="text-white font-medium">{task.title}</h3>
                                                    </div>
                                                    <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                                                    <div className="flex items-center gap-4 text-sm text-gray-300">
                                                        <span>🎯 +{task.base_points} pt</span>
                                                        <span>⚡ +{task.bonus_xp} XP</span>
                                                        {task.deadline && (
                                                            <span>📅 {new Date(task.deadline).toLocaleDateString('ja-JP')}</span>
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

