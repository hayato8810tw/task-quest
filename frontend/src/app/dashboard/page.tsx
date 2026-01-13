"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMe, getTasks, claimLoginBonus, completeTask, getLoginBonusStatus, User, Task } from "@/lib/api";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [loginBonusClaimed, setLoginBonusClaimed] = useState(false);

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
                    // localStorageも更新
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
            // ユーザー情報を再取得
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
            // タスクとユーザー情報を再取得
            const [userRes, tasksRes] = await Promise.all([
                getMe(token),
                getTasks(token),
            ]);
            if (userRes.success && userRes.data) setUser(userRes.data);
            if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
        }
    };

    // レベルアップに必要なXP計算
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
