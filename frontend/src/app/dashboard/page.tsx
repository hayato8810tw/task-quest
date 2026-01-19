"use client";

import { useEffect, useState, DragEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getMe, getTasks, claimLoginBonus, completeTask, getLoginBonusStatus, User, Task } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api";

const DAYS = [
    { key: "MONDAY", label: "月曜" },
    { key: "TUESDAY", label: "火曜" },
    { key: "WEDNESDAY", label: "水曜" },
    { key: "THURSDAY", label: "木曜" },
    { key: "FRIDAY", label: "金曜" },
];

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

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [loginBonusClaimed, setLoginBonusClaimed] = useState(false);
    const [draggedTask, setDraggedTask] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

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

    // タスクステータス更新
    const handleStatusChange = async (taskId: string, newStatus: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setUpdatingStatus(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                // タスク一覧とユーザー情報を再取得
                const [tasksRes, userRes] = await Promise.all([
                    getTasks(token),
                    getMe(token),
                ]);
                if (tasksRes.success && tasksRes.data) {
                    setTasks(tasksRes.data);
                    // モーダルのタスクも更新
                    const updated = tasksRes.data.find((t: Task) => t.id === taskId);
                    if (updated) setSelectedTask(updated);
                }
                if (userRes.success && userRes.data) setUser(userRes.data);
            }
        } catch (error) {
            console.error("Failed to update status:", error);
        }
        setUpdatingStatus(false);
    };

    // タスクカードクリック
    const handleTaskClick = (task: Task, e: React.MouseEvent) => {
        // ドラッグ中はモーダルを開かない
        if (draggedTask) return;
        e.stopPropagation();
        setSelectedTask(task);
    };

    const getRequiredXp = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
    const xpProgress = user ? (user.current_xp / getRequiredXp(user.level)) * 100 : 0;



    const statusColors: Record<string, string> = {
        PENDING: "bg-gray-500",
        IN_PROGRESS: "bg-blue-500",
        COMPLETED: "bg-green-500",
    };

    // ステータスソート順（進行中 > 未着手 > 完了）
    const statusOrder: Record<string, number> = { IN_PROGRESS: 0, PENDING: 1, COMPLETED: 2 };

    // 曜日ごとにタスクをグループ化（ステータス順でソート）
    const getTasksByDay = (day: string) => {
        return tasks
            .filter(t => (t as any).scheduled_day === day && t.status !== "COMPLETED")
            .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
    };

    // 未割り当てタスク（ステータス順でソート）
    const unscheduledTasks = tasks
        .filter(t => !(t as any).scheduled_day && t.status !== "COMPLETED")
        .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

    // 今日の日付（0時0分基準）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1週間前の日付
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // 本日完了したタスク
    const completedToday = tasks.filter(t => {
        if (t.status !== "COMPLETED" || !(t as any).completedAt) return false;
        const completedDate = new Date((t as any).completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
    });

    // 1週間以内に完了したタスク（今日除く）
    const completedThisWeek = tasks.filter(t => {
        if (t.status !== "COMPLETED" || !(t as any).completedAt) return false;
        const completedDate = new Date((t as any).completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() >= weekAgo.getTime() && completedDate.getTime() < today.getTime();
    });

    // 履歴表示の切り替え
    const [showWeekHistory, setShowWeekHistory] = useState(false);

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
                                                onClick={(e) => handleTaskClick(task, e)}
                                                className={`p-2 rounded bg-white/10 border border-white/20 cursor-pointer hover:bg-white/20 transition-colors ${draggedTask === task.id ? "opacity-50" : ""
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
                                            onClick={(e) => handleTaskClick(task, e)}
                                            className={`px-3 py-2 rounded bg-white/10 border border-white/20 cursor-pointer hover:bg-white/20 transition-colors ${draggedTask === task.id ? "opacity-50" : ""
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

                        {/* 本日完了したタスク */}
                        {completedToday.length > 0 && (
                            <div className="mt-4 p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                                <div className="text-green-400 text-sm font-medium mb-2 flex items-center gap-2">
                                    ✅ 本日完了したタスク ({completedToday.length}件)
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {completedToday.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={(e) => handleTaskClick(task, e)}
                                            className="px-3 py-2 rounded bg-green-500/20 border border-green-500/30 cursor-pointer hover:bg-green-500/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-400">✓</span>
                                                <span className="text-white text-sm">{task.title}</span>
                                                <span className="text-green-400 text-xs">+{task.base_points}pt</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 週間履歴 */}
                        {completedThisWeek.length > 0 && (
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowWeekHistory(!showWeekHistory)}
                                    className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-2"
                                >
                                    📊 今週の完了履歴を{showWeekHistory ? "隠す" : "表示"} ({completedThisWeek.length}件)
                                    <span className="text-xs">{showWeekHistory ? "▲" : "▼"}</span>
                                </button>
                                {showWeekHistory && (
                                    <div className="mt-2 p-3 rounded-lg border border-white/10 bg-white/5 space-y-2">
                                        {completedThisWeek.map(task => {
                                            const completedDate = new Date((task as any).completedAt);
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={(e) => handleTaskClick(task, e)}
                                                    className="flex items-center justify-between p-2 rounded bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-green-400">✓</span>
                                                        <span className="text-white text-sm">{task.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <span>{completedDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}</span>
                                                        <span className="text-green-400">+{task.base_points}pt</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* 未着手 (PENDING) */}
                                <TaskColumn
                                    title="未着手"
                                    statusColor="bg-yellow-500"
                                    countColor="text-yellow-300 border-yellow-500/30"
                                    tasks={tasks.filter(t => t.status === "PENDING")}
                                    onTaskClick={(task) => handleTaskClick(task, {} as any)}
                                />

                                {/* 進行中 (IN_PROGRESS) */}
                                <TaskColumn
                                    title="進行中"
                                    statusColor="bg-blue-500 animate-pulse"
                                    countColor="text-blue-300 border-blue-500/30"
                                    tasks={tasks.filter(t => t.status === "IN_PROGRESS")}
                                    onTaskClick={(task) => handleTaskClick(task, {} as any)}
                                />

                                {/* 完了 (COMPLETED) */}
                                <TaskColumn
                                    title="完了済"
                                    statusColor="bg-green-500"
                                    countColor="text-green-300 border-green-500/30"
                                    tasks={tasks.filter(t => t.status === "COMPLETED")}
                                    onTaskClick={(task) => handleTaskClick(task, {} as any)}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* タスク詳細モーダル */}
                <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
                    <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                {selectedTask && (
                                    <>
                                        <Badge className={priorityColors[selectedTask.priority]}>
                                            {priorityLabels[selectedTask.priority]}
                                        </Badge>
                                        {selectedTask.title}
                                    </>
                                )}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedTask && (
                            <div className="space-y-4 mt-2">
                                {/* プロジェクト・エピック */}
                                {(selectedTask as any).epic && (
                                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                                        <div className="text-purple-300 text-sm">
                                            📁 {(selectedTask as any).epic.project?.title} / {(selectedTask as any).epic.title}
                                        </div>
                                    </div>
                                )}

                                {/* 説明 */}
                                {selectedTask.description && (
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-gray-400 text-xs mb-1">説明</div>
                                        <p className="text-white text-sm">{selectedTask.description}</p>
                                    </div>
                                )}

                                {/* ステータス */}
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                    <div className="text-gray-400 text-xs mb-2">ステータス</div>
                                    <div className="flex gap-2">
                                        {[
                                            { key: "PENDING", label: "未着手", color: "bg-gray-500 hover:bg-gray-600" },
                                            { key: "IN_PROGRESS", label: "進行中", color: "bg-blue-500 hover:bg-blue-600" },
                                            { key: "COMPLETED", label: "完了", color: "bg-green-500 hover:bg-green-600" },
                                        ].map((status) => (
                                            <Button
                                                key={status.key}
                                                size="sm"
                                                disabled={updatingStatus || selectedTask.status === status.key}
                                                onClick={() => handleStatusChange(selectedTask.id, status.key)}
                                                className={`${selectedTask.status === status.key
                                                    ? status.color + " ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                                                    : "bg-white/10 hover:bg-white/20"
                                                    } transition-all`}
                                            >
                                                {status.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* 詳細情報 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-gray-400 text-xs mb-1">🎯 ポイント</div>
                                        <div className="text-yellow-400 font-bold">+{selectedTask.base_points} pt</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-gray-400 text-xs mb-1">⚡ 経験値</div>
                                        <div className="text-emerald-400 font-bold">+{selectedTask.bonus_xp} XP</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-gray-400 text-xs mb-1">📊 難易度</div>
                                        <div className="text-white font-bold">{"⭐".repeat(selectedTask.difficulty)}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-gray-400 text-xs mb-1">📅 期限</div>
                                        <div className="text-white font-bold text-sm">
                                            {selectedTask.deadline
                                                ? new Date(selectedTask.deadline).toLocaleDateString("ja-JP")
                                                : "なし"}
                                        </div>
                                    </div>
                                </div>

                                {/* 予定曜日 */}
                                {(selectedTask as any).scheduled_day && (
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-gray-400 text-xs mb-1">🗓️ 予定曜日</div>
                                        <div className="text-white font-bold">
                                            {DAYS.find(d => d.key === (selectedTask as any).scheduled_day)?.label || "未設定"}
                                        </div>
                                    </div>
                                )}

                                {/* 閉じるボタン */}
                                <Button
                                    onClick={() => setSelectedTask(null)}
                                    className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                >
                                    閉じる
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

function TaskColumn({ title, statusColor, countColor, tasks, onTaskClick }: { title: string, statusColor: string, countColor: string, tasks: Task[], onTaskClick: (task: Task) => void }) {
    const groupedTasks = useMemo(() => {
        const groups: Record<string, { name: string, tasks: Task[] }> = {};
        const noProjectKey = "other";

        tasks.forEach((task) => {
            const projectId = task.epic?.project?.id || noProjectKey;
            const projectName = task.epic?.project?.title || "未分類";

            if (!groups[projectId]) {
                groups[projectId] = { name: projectName, tasks: [] };
            }
            groups[projectId].tasks.push(task);
        });

        return groups;
    }, [tasks]);

    const projectIds = Object.keys(groupedTasks).sort((a, b) => {
        if (a === "other") return 1;
        if (b === "other") return -1;
        return 0;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                <span className="text-gray-300 font-medium">{title}</span>
                <Badge variant="outline" className={`ml-auto ${countColor}`}>
                    {tasks.length}
                </Badge>
            </div>

            <div className="space-y-6">
                {projectIds.map(pid => {
                    const group = groupedTasks[pid];
                    return (
                        <div key={pid} className="space-y-2">
                            {pid !== "other" && (
                                <h4 className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-wider pl-1 opacity-80 border-b border-white/5 pb-1 mb-2">
                                    📁 {group.name}
                                </h4>
                            )}
                            <div className="space-y-3">
                                {group.tasks.map(task => (
                                    <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                                ))}
                            </div>
                        </div>
                    );
                })}
                {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm italic">
                        タスクはありません
                    </div>
                )}
            </div>
        </div>
    );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
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
            onClick={onClick}
            className={`p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer ${borderColor} ${completedStyle}`}
        >
            {task.status === "IN_PROGRESS" && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-blue-500/20 w-fit">
                    <span className="animate-pulse">🔵</span>
                    <span className="text-blue-300 text-sm font-medium">進行中</span>
                </div>
            )}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    </div>
                    <h3 className="text-white font-medium mb-1 mt-1">{task.title}</h3>
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">{task.description}</p>
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
}
