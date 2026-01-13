"use client";
import { API_BASE_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Redemption {
    id: string;
    user_id: string;
    user_name: string;
    user_department: string;
    user_email: string;
    reward_id: string;
    reward_name: string;
    reward_image: string;
    points_spent: number;
    status: string;
    redeemed_at: string;
    delivered_at: string | null;
}

export default function RewardRequestsPage() {
    const router = useRouter();
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token) {
            router.push("/login");
            return;
        }

        if (userData) {
            const user = JSON.parse(userData);
            if (user.role !== "ADMIN") {
                router.push("/dashboard");
                return;
            }
        }

        fetchRedemptions();
    }, [router]);

    const fetchRedemptions = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/rewards/admin/redemptions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setRedemptions(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch redemptions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm("この申請を承認しますか？")) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        setProcessing(id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rewards/redemptions/${id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                await fetchRedemptions();
            } else {
                alert(data.error || "承認に失敗しました");
            }
        } catch (error) {
            console.error("Failed to approve:", error);
            alert("承認に失敗しました");
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("この申請を却下しますか？\nポイントはユーザーに返却されます。")) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        setProcessing(id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rewards/redemptions/${id}/reject`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                await fetchRedemptions();
            } else {
                alert(data.error || "却下に失敗しました");
            }
        } catch (error) {
            console.error("Failed to reject:", error);
            alert("却下に失敗しました");
        } finally {
            setProcessing(null);
        }
    };

    const filteredRedemptions = filter === "all"
        ? redemptions
        : redemptions.filter(r => r.status === filter);

    const statusConfig: Record<string, { label: string; color: string }> = {
        PENDING: { label: "申請中", color: "bg-yellow-500/20 text-yellow-300" },
        APPROVED: { label: "承認済み", color: "bg-green-500/20 text-green-300" },
        REJECTED: { label: "却下", color: "bg-red-500/20 text-red-300" },
    };

    const pendingCount = redemptions.filter(r => r.status === "PENDING").length;

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
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            📋 報酬申請管理
                            {pendingCount > 0 && (
                                <Badge className="bg-yellow-500/20 text-yellow-300">
                                    {pendingCount}件の申請待ち
                                </Badge>
                            )}
                        </h2>
                        <p className="text-gray-400">ユーザーからの報酬申請を承認・却下できます</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/rewards")}
                        className="bg-white/10 text-white border-white/20"
                    >
                        ← 報酬センターへ戻る
                    </Button>
                </div>

                {/* フィルター */}
                <div className="mb-6">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="ステータス" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/10">
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="PENDING">申請中</SelectItem>
                            <SelectItem value="APPROVED">承認済み</SelectItem>
                            <SelectItem value="REJECTED">却下</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 申請一覧 */}
                {filteredRedemptions.length === 0 ? (
                    <Card className="bg-white/5 border-white/10 backdrop-blur">
                        <CardContent className="py-12 text-center">
                            <p className="text-gray-400">申請がありません</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredRedemptions.map((redemption) => (
                            <Card
                                key={redemption.id}
                                className={`bg-white/5 border-white/10 backdrop-blur ${redemption.status === "PENDING" ? "border-l-4 border-l-yellow-500" : ""}`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl">{redemption.reward_image}</span>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-white font-medium">{redemption.reward_name}</h4>
                                                    <Badge className={statusConfig[redemption.status]?.color}>
                                                        {statusConfig[redemption.status]?.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-400">
                                                    申請者: {redemption.user_name} ({redemption.user_department})
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {new Date(redemption.redeemed_at).toLocaleDateString("ja-JP")} - {redemption.points_spent.toLocaleString()} pt
                                                </p>
                                            </div>
                                        </div>

                                        {redemption.status === "PENDING" && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(redemption.id)}
                                                    disabled={processing === redemption.id}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    ✓ 承認
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReject(redemption.id)}
                                                    disabled={processing === redemption.id}
                                                    className="bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                                >
                                                    ✗ 却下
                                                </Button>
                                            </div>
                                        )}

                                        {redemption.status === "APPROVED" && redemption.delivered_at && (
                                            <div className="text-sm text-green-400">
                                                ✓ {new Date(redemption.delivered_at).toLocaleDateString("ja-JP")} に承認
                                            </div>
                                        )}

                                        {redemption.status === "REJECTED" && (
                                            <div className="text-sm text-red-400">
                                                ✗ 却下済み（ポイント返却）
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
