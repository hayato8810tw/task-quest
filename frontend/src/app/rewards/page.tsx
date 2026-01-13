"use client";
import { API_BASE_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Reward {
    id: string;
    name: string;
    description: string;
    category: string;
    points_required: number;
    stock: number | null;
    image_url: string;
}

interface Redemption {
    id: string;
    reward_name: string;
    points_spent: number;
    status: string;
    redeemed_at: string;
}

interface User {
    available_points: number;
    role?: string;
}

export default function RewardsPage() {
    const router = useRouter();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [activeTab, setActiveTab] = useState<"catalog" | "history">("catalog");
    const [userRole, setUserRole] = useState<string>("");

    const fetchRedemptions = async (token: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/rewards/redemptions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setRedemptions(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch redemptions:", error);
        }
    };

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

        const fetchData = async () => {
            try {
                const [rewardsRes, userRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/rewards`),
                    fetch(`${API_BASE_URL}/users/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                const rewardsData = await rewardsRes.json();
                const userData = await userRes.json();

                if (rewardsData.success) {
                    setRewards(rewardsData.data);
                }
                if (userData.success) {
                    setUser(userData.data);
                }

                await fetchRedemptions(token);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleRedeem = async () => {
        if (!selectedReward) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        setRedeeming(true);
        try {
            const res = await fetch(`${API_BASE_URL}/rewards/redeem`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reward_id: selectedReward.id }),
            });

            const result = await res.json();
            if (result.success) {
                // ユーザー情報を更新
                const userRes = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const userData = await userRes.json();
                if (userData.success) {
                    setUser(userData.data);
                    localStorage.setItem("user", JSON.stringify(userData.data));
                }
                // 交換履歴を更新
                await fetchRedemptions(token);
                setSelectedReward(null);
                alert("📋 報酬を申請しました！\n管理者の承認後に受け取れます。");
            } else {
                alert(result.error || "交換に失敗しました");
            }
        } catch (error) {
            alert("エラーが発生しました");
        } finally {
            setRedeeming(false);
        }
    };

    const categoryLabels: Record<string, { label: string; icon: string }> = {
        monetary: { label: "金銭的報酬", icon: "🎁" },
        experience: { label: "体験型報酬", icon: "🌟" },
        merchandise: { label: "グッズ報酬", icon: "🛍️" },
        development: { label: "成長支援", icon: "📚" },
    };

    const statusLabels: Record<string, { label: string; color: string }> = {
        PENDING: { label: "申請中", color: "bg-yellow-500/20 text-yellow-300" },
        APPROVED: { label: "承認済み", color: "bg-green-500/20 text-green-300" },
        DELIVERED: { label: "受取完了", color: "bg-blue-500/20 text-blue-300" },
        REJECTED: { label: "却下", color: "bg-red-500/20 text-red-300" },
    };

    // 報酬をグループ化（同じ名前+カテゴリ+ポイントをまとめる）
    interface GroupedReward {
        name: string;
        description: string;
        category: string;
        points_required: number;
        image_url: string;
        total_stock: number;
        reward_ids: string[];
    }

    const groupRewards = (rewardList: Reward[]): GroupedReward[] => {
        const groups = new Map<string, GroupedReward>();

        rewardList.forEach(reward => {
            const key = `${reward.name}-${reward.category}-${reward.points_required}`;
            if (groups.has(key)) {
                const existing = groups.get(key)!;
                existing.total_stock += reward.stock ?? 1;
                existing.reward_ids.push(reward.id);
            } else {
                groups.set(key, {
                    name: reward.name,
                    description: reward.description,
                    category: reward.category,
                    points_required: reward.points_required,
                    image_url: reward.image_url,
                    total_stock: reward.stock ?? 1,
                    reward_ids: [reward.id],
                });
            }
        });

        return Array.from(groups.values());
    };

    const groupedRewards = groupRewards(rewards);

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
                    <h2 className="text-2xl font-bold text-white">🎁 報酬センター</h2>
                    <div className="flex items-center gap-4">
                        {userRole === "ADMIN" && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/rewards/requests")}
                                    className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30"
                                >
                                    📋 申請管理
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/rewards/admin")}
                                    className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                                >
                                    ⚙️ 報酬管理
                                </Button>
                            </>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20">
                            <span className="text-yellow-400">💰</span>
                            <span className="text-white font-bold">
                                {user?.available_points.toLocaleString()} pt
                            </span>
                            <span className="text-gray-400">保有中</span>
                        </div>
                    </div>
                </div>

                {/* タブ切り替え */}
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={activeTab === "catalog" ? "default" : "outline"}
                        onClick={() => setActiveTab("catalog")}
                        className={activeTab === "catalog"
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-white/10 text-white border-white/20 hover:bg-white/20"}
                    >
                        🛒 カタログ
                    </Button>
                    <Button
                        variant={activeTab === "history" ? "default" : "outline"}
                        onClick={() => setActiveTab("history")}
                        className={activeTab === "history"
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-white/10 text-white border-white/20 hover:bg-white/20"}
                    >
                        📋 交換履歴 ({redemptions.length})
                    </Button>
                </div>

                {/* カタログタブ */}
                {activeTab === "catalog" && (
                    <>
                        {Object.entries(categoryLabels).map(([category, { label, icon }]) => {
                            const categoryRewards = groupedRewards.filter((r) => r.category === category);
                            if (categoryRewards.length === 0) return null;

                            return (
                                <div key={category} className="mb-8">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <span>{icon}</span> {label}
                                    </h3>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {categoryRewards.map((grouped) => {
                                            const canAfford = (user?.available_points || 0) >= grouped.points_required;
                                            const outOfStock = grouped.total_stock <= 0;
                                            // 交換時に使う実際のRewardを見つける
                                            const availableReward = rewards.find(r =>
                                                grouped.reward_ids.includes(r.id) && (r.stock === null || r.stock > 0)
                                            );

                                            return (
                                                <Card
                                                    key={grouped.name + grouped.points_required}
                                                    className={`bg-white/5 border-white/10 backdrop-blur transition-all ${canAfford && !outOfStock
                                                        ? "hover:bg-white/10 hover:border-purple-500/50 cursor-pointer"
                                                        : "opacity-60"
                                                        }`}
                                                    onClick={() => canAfford && !outOfStock && availableReward && setSelectedReward(availableReward)}
                                                >
                                                    <CardContent className="pt-4">
                                                        <div className="text-center mb-3">
                                                            <span className="text-4xl">{grouped.image_url}</span>
                                                        </div>
                                                        <h4 className="text-white font-medium text-center mb-1">
                                                            {grouped.name}
                                                        </h4>
                                                        <p className="text-gray-400 text-xs text-center mb-3">
                                                            {grouped.description}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                                                                {grouped.points_required.toLocaleString()} pt
                                                            </span>
                                                            {outOfStock ? (
                                                                <Badge variant="outline" className="text-red-400 border-red-500/50">
                                                                    在庫切れ
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-green-400 border-green-500/50">
                                                                    在庫 {grouped.total_stock}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* 交換履歴タブ */}
                {activeTab === "history" && (() => {
                    // 同じ報酬をグループ化
                    const groupedRedemptions = redemptions.reduce((acc, redemption) => {
                        const key = `${redemption.reward_name}_${redemption.status}`;
                        if (!acc[key]) {
                            acc[key] = {
                                ...redemption,
                                count: 1,
                                total_points: redemption.points_spent,
                            };
                        } else {
                            acc[key].count += 1;
                            acc[key].total_points += redemption.points_spent;
                            // 最新の日付を使用
                            if (new Date(redemption.redeemed_at) > new Date(acc[key].redeemed_at)) {
                                acc[key].redeemed_at = redemption.redeemed_at;
                            }
                        }
                        return acc;
                    }, {} as Record<string, Redemption & { count: number; total_points: number }>);

                    const groupedList = Object.values(groupedRedemptions);

                    return (
                        <Card className="bg-white/5 border-white/10 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="text-white">交換履歴</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {groupedList.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">
                                        まだ報酬を交換していません
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {groupedList.map((redemption, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                                            >
                                                <div className="flex-1">
                                                    <h4 className="text-white font-medium flex items-center gap-2">
                                                        {redemption.reward_name}
                                                        {redemption.count > 1 && (
                                                            <span className="px-2 py-0.5 text-xs bg-purple-500/30 text-purple-300 rounded-full">
                                                                ×{redemption.count}
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="text-gray-400 text-sm">
                                                        {redemption.count > 1 ? "最新: " : ""}
                                                        {new Date(redemption.redeemed_at).toLocaleDateString("ja-JP", {
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-yellow-400 font-bold">
                                                        -{redemption.total_points.toLocaleString()} pt
                                                    </span>
                                                    <Badge className={statusLabels[redemption.status]?.color || "bg-gray-500/20 text-gray-300"}>
                                                        {statusLabels[redemption.status]?.label || redemption.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })()}
            </main>

            {/* 交換確認ダイアログ */}
            <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
                <DialogContent className="bg-slate-800 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="text-2xl">{selectedReward?.image_url}</span>
                            {selectedReward?.name}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {selectedReward?.description}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                            <span className="text-gray-300">必要ポイント</span>
                            <span className="text-xl font-bold text-yellow-400">
                                {selectedReward?.points_required.toLocaleString()} pt
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 mt-2 rounded-lg bg-white/5">
                            <span className="text-gray-300">交換後の残高</span>
                            <span className="text-xl font-bold text-white">
                                {((user?.available_points || 0) - (selectedReward?.points_required || 0)).toLocaleString()} pt
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedReward(null)}
                            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleRedeem}
                            disabled={redeeming}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            {redeeming ? "交換中..." : "交換する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
