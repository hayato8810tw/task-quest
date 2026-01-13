"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getMe, User } from "@/lib/api";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const fetchUser = async () => {
            const result = await getMe(token);
            if (result.success && result.data) {
                setUser(result.data);
            }
            setLoading(false);
        };

        fetchUser();
    }, [router]);

    const getRequiredXp = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
    const xpProgress = user ? (user.current_xp / getRequiredXp(user.level)) * 100 : 0;

    const roleLabels: Record<string, string> = {
        USER: "一般ユーザー",
        MANAGER: "マネージャー",
        ADMIN: "管理者",
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

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* プロフィールヘッダー */}
                <Card className="bg-white/5 border-white/10 backdrop-blur mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-3xl">
                                    {user?.display_name?.charAt(0) || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-white mb-1">{user?.display_name}</h1>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                                        {roleLabels[user?.role || "USER"]}
                                    </Badge>
                                    <span>📧 {user?.email}</span>
                                    <span>🏢 {user?.department}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ステータス */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">⚔️</div>
                                <div>
                                    <p className="text-gray-400 text-sm">レベル</p>
                                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                        Lv.{user?.level}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>XP</span>
                                    <span>{user?.current_xp} / {user ? getRequiredXp(user.level) : 0}</span>
                                </div>
                                <Progress value={xpProgress} className="h-2 bg-emerald-900/50" indicatorClassName="bg-gradient-to-r from-emerald-500 to-green-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">💰</div>
                                <div>
                                    <p className="text-gray-400 text-sm">利用可能ポイント</p>
                                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                                        {user?.available_points.toLocaleString()} pt
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                累計獲得: {user?.total_points.toLocaleString()} pt
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">🔥</div>
                                <div>
                                    <p className="text-gray-400 text-sm">ログインストリーク</p>
                                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                                        {user?.login_streak}日連続
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* バッジ */}
                <Card className="bg-white/5 border-white/10 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            🏆 獲得バッジ
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {user?.badges && user.badges.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {user.badges.map((badge) => (
                                    <div
                                        key={badge.id}
                                        className="p-4 rounded-lg bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors"
                                    >
                                        <div className="text-3xl mb-2">{badge.icon_url}</div>
                                        <p className="text-white font-medium text-sm">{badge.name}</p>
                                        <p className="text-gray-400 text-xs mt-1">{badge.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-8">
                                まだバッジを獲得していません。タスクを完了してバッジを集めましょう！
                            </p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
