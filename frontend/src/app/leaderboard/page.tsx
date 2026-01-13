"use client";
import { API_BASE_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
    rank: number;
    id: string;
    display_name: string;
    department: string;
    level: number;
    period_points: number;
    avatar_url: string | null;
}

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "total";

const periodLabels: Record<PeriodType, { label: string; emoji: string; description: string }> = {
    daily: { label: "デイリー", emoji: "📅", description: "本日獲得ポイント" },
    weekly: { label: "ウィークリー", emoji: "📆", description: "今週獲得ポイント" },
    monthly: { label: "マンスリー", emoji: "🗓️", description: "今月獲得ポイント" },
    yearly: { label: "年間", emoji: "📊", description: "今年獲得ポイント" },
    total: { label: "累計", emoji: "🏆", description: "累計獲得ポイント" },
};

export default function LeaderboardPage() {
    const router = useRouter();
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [period, setPeriod] = useState<PeriodType>("total");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const userData = localStorage.getItem("user");
        if (userData) {
            setCurrentUserId(JSON.parse(userData).id);
        }
    }, [router]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/leaderboard?period=${period}&limit=20`);
                const data = await res.json();
                if (data.success) {
                    setLeaders(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [period]);

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900";
            case 2:
                return "bg-gradient-to-r from-gray-300 to-gray-400 text-slate-900";
            case 3:
                return "bg-gradient-to-r from-amber-600 to-orange-600 text-white";
            default:
                return "bg-slate-600 text-white";
        }
    };

    const getRankEmoji = (rank: number) => {
        switch (rank) {
            case 1:
                return "🥇";
            case 2:
                return "🥈";
            case 3:
                return "🥉";
            default:
                return "";
        }
    };

    // トップ3を表彰台順に並び替え（2位、1位、3位）
    const getTopThreeOrdered = () => {
        const top3 = leaders.slice(0, 3);
        if (top3.length < 3) return top3;
        return [top3[1], top3[0], top3[2]]; // 2位、1位、3位の順
    };

    const topThree = getTopThreeOrdered();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">🏆 リーダーボード</h2>
                    <p className="text-gray-400">{periodLabels[period].description}によるランキング</p>
                    {period === "total" && (
                        <p className="text-gray-500 text-sm mt-1">※報酬交換で使用しても累計ポイントは減りません</p>
                    )}
                </div>

                {/* 期間切替タブ */}
                <div className="flex justify-center gap-2 mb-8">
                    {(Object.keys(periodLabels) as PeriodType[]).map((p) => (
                        <Button
                            key={p}
                            variant={period === p ? "default" : "outline"}
                            onClick={() => setPeriod(p)}
                            className={period === p
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                                : "bg-white/5 text-gray-300 border-white/20 hover:bg-white/10"}
                        >
                            {periodLabels[p].emoji} {periodLabels[p].label}
                        </Button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[40vh]">
                        <div className="text-white text-xl">読み込み中...</div>
                    </div>
                ) : (
                    <>
                        {/* トップ3 - 表彰台スタイル */}
                        {topThree.length > 0 && (
                            <div className="grid grid-cols-3 gap-4 mb-8 items-end">
                                {topThree.map((entry, index) => {
                                    if (!entry) return <div key={index} />;
                                    const isFirst = entry.rank === 1;

                                    return (
                                        <Card
                                            key={entry.id}
                                            className={`bg-white/5 border-white/10 backdrop-blur ${isFirst ? "md:pb-4" : ""
                                                }`}
                                            style={{
                                                minHeight: isFirst ? "280px" : "240px",
                                                marginTop: isFirst ? "0" : "40px"
                                            }}
                                        >
                                            <CardContent className="pt-6 text-center h-full flex flex-col justify-center">
                                                <div className="text-5xl mb-3">{getRankEmoji(entry.rank)}</div>
                                                <Avatar className={`mx-auto mb-3 ${isFirst ? "h-20 w-20" : "h-16 w-16"}`}>
                                                    <AvatarFallback className={`${getRankStyle(entry.rank)} ${isFirst ? "text-2xl" : "text-xl"} font-bold`}>
                                                        {entry.display_name?.charAt(0) || "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <h3 className={`text-white font-bold ${isFirst ? "text-lg" : "text-base"}`}>
                                                    {entry.display_name}
                                                </h3>
                                                <p className="text-gray-400 text-sm mb-3">{entry.department}</p>
                                                <div className="flex flex-col items-center gap-2">
                                                    <Badge className="bg-purple-500/20 text-purple-300">
                                                        Lv.{entry.level}
                                                    </Badge>
                                                    <span className={`text-yellow-400 font-bold ${isFirst ? "text-xl" : "text-lg"}`}>
                                                        {entry.period_points.toLocaleString()} pt
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* 4位以下 */}
                        {leaders.length > 3 && (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="text-white">ランキング（4位〜）</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {leaders.slice(3).map((leader) => (
                                            <div
                                                key={leader.id}
                                                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${leader.id === currentUserId
                                                    ? "bg-purple-500/20 border border-purple-500/30"
                                                    : "bg-white/5 hover:bg-white/10"
                                                    }`}
                                            >
                                                <div className="w-8 text-center font-bold text-gray-400">
                                                    #{leader.rank}
                                                </div>
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-slate-600 text-white">
                                                        {leader.display_name?.charAt(0) || "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-medium">{leader.display_name}</span>
                                                        {leader.id === currentUserId && (
                                                            <Badge className="bg-purple-500 text-white text-xs">あなた</Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-gray-400 text-sm">{leader.department}</span>
                                                </div>
                                                <Badge className="hidden sm:flex bg-white/10 text-gray-300">
                                                    Lv.{leader.level}
                                                </Badge>
                                                <span className="text-yellow-400 font-bold">
                                                    {leader.period_points.toLocaleString()} pt
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {leaders.length === 0 && (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-400">
                                        {period === "daily" && "本日のランキングデータがありません"}
                                        {period === "weekly" && "今週のランキングデータがありません"}
                                        {period === "yearly" && "今年のランキングデータがありません"}
                                        {period === "total" && "ランキングデータがありません"}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
