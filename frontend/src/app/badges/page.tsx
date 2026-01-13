"use client";
import { API_BASE_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const CONDITION_TYPES = [
    { value: "", label: "なし（手動付与）" },
    { value: "task_count", label: "タスク完了数" },
    { value: "streak", label: "連続ログイン日数" },
    { value: "early_completion", label: "期限前完了数" },
    { value: "team_task", label: "チームタスク完了数" },
    { value: "level", label: "レベル達成" },
    { value: "total_points", label: "累計ポイント" },
];

interface BadgeItem {
    id: string;
    name: string;
    description: string;
    icon_url: string;
    condition_type?: string;
    condition_value?: number;
    reward_points: number;
}

interface UserBadge {
    id: string;
    name: string;
    description: string;
    icon_url: string;
    earned_at: string;
}

export default function BadgesPage() {
    const router = useRouter();
    const [allBadges, setAllBadges] = useState<BadgeItem[]>([]);
    const [myBadges, setMyBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("");

    // 管理者用ステート
    const [showNewForm, setShowNewForm] = useState(false);
    const [editBadge, setEditBadge] = useState<BadgeItem | null>(null);
    const [newBadge, setNewBadge] = useState({
        name: "",
        description: "",
        icon_url: "🏆",
        condition_type: "",
        condition_value: "",
        reward_points: "100"
    });

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

        fetchBadges();
    }, [router]);

    const fetchBadges = async () => {
        const token = localStorage.getItem("token");
        try {
            const [allRes, myRes] = await Promise.all([
                fetch(`${API_BASE_URL}/badges`),
                fetch(`${API_BASE_URL}/badges/my`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const allData = await allRes.json();
            const myData = await myRes.json();

            if (allData.success) setAllBadges(allData.data);
            if (myData.success) setMyBadges(myData.data);
        } catch (error) {
            console.error("Failed to fetch badges:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        const token = localStorage.getItem("token");
        if (!token || !newBadge.name) return;

        try {
            const res = await fetch(`${API_BASE_URL}/badges`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newBadge)
            });
            const data = await res.json();
            if (data.success) {
                setAllBadges([...allBadges, data.data]);
                setNewBadge({ name: "", description: "", icon_url: "🏆", condition_type: "", condition_value: "", reward_points: "100" });
                setShowNewForm(false);
            } else {
                alert(data.error || "作成に失敗しました");
            }
        } catch (error) {
            alert("エラーが発生しました");
        }
    };

    const handleUpdate = async () => {
        if (!editBadge) return;
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/badges/${editBadge.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editBadge.name,
                    description: editBadge.description,
                    icon_url: editBadge.icon_url,
                    condition_type: editBadge.condition_type,
                    condition_value: editBadge.condition_value,
                    reward_points: editBadge.reward_points
                })
            });
            const data = await res.json();
            if (data.success) {
                setAllBadges(allBadges.map(b => b.id === editBadge.id ? data.data : b));
                setEditBadge(null);
            } else {
                alert(data.error || "更新に失敗しました");
            }
        } catch (error) {
            alert("エラーが発生しました");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`バッジ「${name}」を削除しますか？`)) return;
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/badges/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAllBadges(allBadges.filter(b => b.id !== id));
            } else {
                alert(data.error || "削除に失敗しました");
            }
        } catch (error) {
            alert("エラーが発生しました");
        }
    };

    const earnedBadgeIds = new Set(myBadges.map((b) => b.id));
    const earnedCount = myBadges.length;
    const totalCount = allBadges.length;
    const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;
    const isAdmin = userRole === "ADMIN";

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
                <div className="flex items-center justify-between mb-8">
                    <div className="text-center flex-1">
                        <h2 className="text-3xl font-bold text-white mb-2">🏆 バッジコレクション</h2>
                        <p className="text-gray-400">タスクを完了してバッジを集めよう！</p>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => setShowNewForm(!showNewForm)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600"
                        >
                            + 新規バッジ
                        </Button>
                    )}
                </div>

                {/* 新規作成フォーム */}
                {showNewForm && isAdmin && (
                    <Card className="bg-white/5 border-white/10 backdrop-blur mb-6">
                        <CardHeader>
                            <CardTitle className="text-white">新規バッジ作成</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-300">バッジ名 *</Label>
                                    <Input
                                        value={newBadge.name}
                                        onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300">アイコン（絵文字）</Label>
                                    <Input
                                        value={newBadge.icon_url}
                                        onChange={(e) => setNewBadge({ ...newBadge, icon_url: e.target.value })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-gray-300">説明</Label>
                                <Input
                                    value={newBadge.description}
                                    onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-gray-300">条件タイプ</Label>
                                    <Select
                                        value={newBadge.condition_type}
                                        onValueChange={(v) => setNewBadge({ ...newBadge, condition_type: v })}
                                    >
                                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                            <SelectValue placeholder="選択してください" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CONDITION_TYPES.map(ct => (
                                                <SelectItem key={ct.value} value={ct.value || "none"}>
                                                    {ct.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-gray-300">条件値</Label>
                                    <Input
                                        type="number"
                                        value={newBadge.condition_value}
                                        onChange={(e) => setNewBadge({ ...newBadge, condition_value: e.target.value })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300">報酬ポイント</Label>
                                    <Input
                                        type="number"
                                        value={newBadge.reward_points}
                                        onChange={(e) => setNewBadge({ ...newBadge, reward_points: e.target.value })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">作成</Button>
                                <Button variant="ghost" onClick={() => setShowNewForm(false)} className="text-gray-400">キャンセル</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 編集モーダル */}
                {editBadge && isAdmin && (
                    <Card className="bg-white/5 border-purple-500/30 backdrop-blur mb-6">
                        <CardHeader>
                            <CardTitle className="text-white">バッジ編集: {editBadge.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-300">バッジ名</Label>
                                    <Input
                                        value={editBadge.name}
                                        onChange={(e) => setEditBadge({ ...editBadge, name: e.target.value })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300">アイコン</Label>
                                    <Input
                                        value={editBadge.icon_url}
                                        onChange={(e) => setEditBadge({ ...editBadge, icon_url: e.target.value })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-gray-300">説明</Label>
                                <Input
                                    value={editBadge.description || ""}
                                    onChange={(e) => setEditBadge({ ...editBadge, description: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-gray-300">条件タイプ</Label>
                                    <Select
                                        value={editBadge.condition_type || "none"}
                                        onValueChange={(v) => setEditBadge({ ...editBadge, condition_type: v === "none" ? "" : v })}
                                    >
                                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                            <SelectValue placeholder="選択してください" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CONDITION_TYPES.map(ct => (
                                                <SelectItem key={ct.value || "none"} value={ct.value || "none"}>
                                                    {ct.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-gray-300">条件値</Label>
                                    <Input
                                        type="number"
                                        value={editBadge.condition_value || ""}
                                        onChange={(e) => setEditBadge({ ...editBadge, condition_value: Number(e.target.value) })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300">報酬ポイント</Label>
                                    <Input
                                        type="number"
                                        value={editBadge.reward_points}
                                        onChange={(e) => setEditBadge({ ...editBadge, reward_points: Number(e.target.value) })}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">保存</Button>
                                <Button variant="ghost" onClick={() => setEditBadge(null)} className="text-gray-400">キャンセル</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 進捗 */}
                <Card className="bg-white/5 border-white/10 backdrop-blur mb-8">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">コレクション進捗</span>
                            <span className="text-gray-300">
                                <span className="text-purple-400 font-bold">{earnedCount}</span>
                                {" / "}
                                {totalCount} バッジ獲得
                            </span>
                        </div>
                        <Progress value={progress} className="h-3 bg-blue-900/50" indicatorClassName="bg-gradient-to-r from-blue-500 to-cyan-400" />
                    </CardContent>
                </Card>

                {/* 獲得済みバッジ */}
                {myBadges.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            ✅ 獲得済み
                        </h3>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {myBadges.map((badge) => (
                                <Card
                                    key={badge.id}
                                    className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 backdrop-blur"
                                >
                                    <CardContent className="pt-6 text-center">
                                        <div className="text-5xl mb-3">{badge.icon_url}</div>
                                        <h4 className="text-white font-bold mb-1">{badge.name}</h4>
                                        <p className="text-gray-300 text-sm mb-2">{badge.description}</p>
                                        <Badge className="bg-green-500/20 text-green-300">
                                            {new Date(badge.earned_at).toLocaleDateString("ja-JP")} 獲得
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* 未獲得バッジ（管理者は編集・削除可能） */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        {isAdmin ? "📋 全バッジ管理" : "🔒 未獲得"}
                    </h3>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {allBadges
                            .filter((badge) => isAdmin || !earnedBadgeIds.has(badge.id))
                            .map((badge) => {
                                const isEarned = earnedBadgeIds.has(badge.id);
                                return (
                                    <Card
                                        key={badge.id}
                                        className={`bg-white/5 border-white/10 backdrop-blur ${!isAdmin && !isEarned ? "opacity-60 hover:opacity-80" : ""} transition-opacity`}
                                    >
                                        <CardContent className="pt-6 text-center relative">
                                            {isAdmin && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setEditBadge(badge)}
                                                        className="text-gray-400 hover:text-white h-8 w-8 p-0"
                                                    >
                                                        ✏️
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(badge.id, badge.name)}
                                                        className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                                    >
                                                        🗑️
                                                    </Button>
                                                </div>
                                            )}
                                            <div className={`text-5xl mb-3 ${!isEarned && !isAdmin ? "grayscale" : ""}`}>{badge.icon_url}</div>
                                            <h4 className="text-white font-bold mb-1">{badge.name}</h4>
                                            <p className="text-gray-400 text-sm mb-2">{badge.description}</p>
                                            <div className="flex justify-center gap-2 flex-wrap">
                                                <Badge className="bg-white/10 text-gray-400">
                                                    +{badge.reward_points} pt
                                                </Badge>
                                                {isEarned && (
                                                    <Badge className="bg-green-500/20 text-green-300">獲得済み</Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                    </div>
                </div>
            </main>
        </div>
    );
}
