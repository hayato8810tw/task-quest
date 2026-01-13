"use client";
import { API_BASE_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
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
    is_active: boolean;
    created_at: string;
}

export default function RewardsAdminPage() {
    const router = useRouter();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [editReward, setEditReward] = useState<Reward | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "merchandise",
        points_required: "100",
        stock: "",
        image_url: "🎁",
        is_active: true,
    });

    const categories = [
        { value: "monetary", label: "💰 金銭的報酬" },
        { value: "experience", label: "🌟 体験型報酬" },
        { value: "merchandise", label: "🛍️ グッズ報酬" },
        { value: "development", label: "📚 成長支援" },
    ];

    const emojis = ["🎁", "🎫", "☕", "🍽️", "📚", "🎮", "🏃", "💆", "🎬", "🛒", "💸", "📖"];

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

        fetchRewards();
    }, [router]);

    const fetchRewards = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/rewards/admin/all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setRewards(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch rewards:", error);
        } finally {
            setLoading(false);
        }
    };

    const openNewModal = () => {
        setIsNew(true);
        setFormData({
            name: "",
            description: "",
            category: "merchandise",
            points_required: "100",
            stock: "",
            image_url: "🎁",
            is_active: true,
        });
        setEditReward({} as Reward);
    };

    const openEditModal = (reward: Reward) => {
        setIsNew(false);
        setEditReward(reward);
        setFormData({
            name: reward.name,
            description: reward.description,
            category: reward.category,
            points_required: String(reward.points_required),
            stock: reward.stock !== null ? String(reward.stock) : "",
            image_url: reward.image_url,
            is_active: reward.is_active,
        });
    };

    const handleSave = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setSaving(true);
        try {
            const url = isNew
                ? "http://localhost:3001/api/rewards"
                : `http://localhost:3001/api/rewards/${editReward?.id}`;

            const res = await fetch(url, {
                method: isNew ? "POST" : "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    category: formData.category,
                    points_required: formData.points_required,
                    stock: formData.stock === "" ? null : formData.stock,
                    image_url: formData.image_url,
                    is_active: formData.is_active,
                }),
            });

            const data = await res.json();
            if (data.success) {
                await fetchRewards();
                setEditReward(null);
            } else {
                alert(data.error || "保存に失敗しました");
            }
        } catch (error) {
            console.error("Failed to save reward:", error);
            alert("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この報酬を非表示にしますか？")) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/rewards/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (data.success) {
                await fetchRewards();
            } else {
                alert(data.error || "削除に失敗しました");
            }
        } catch (error) {
            console.error("Failed to delete reward:", error);
            alert("削除に失敗しました");
        }
    };

    const categoryLabels: Record<string, string> = {
        monetary: "💰 金銭的報酬",
        experience: "🌟 体験型報酬",
        merchandise: "🛍️ グッズ報酬",
        development: "📚 成長支援",
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
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            ⚙️ 報酬管理
                        </h2>
                        <p className="text-gray-400">報酬の追加・編集・削除（管理者専用）</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/rewards")}
                            className="bg-white/10 text-white border-white/20"
                        >
                            ← カタログへ戻る
                        </Button>
                        <Button
                            onClick={openNewModal}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            + 新規報酬を追加
                        </Button>
                    </div>
                </div>

                {/* 報酬一覧 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {rewards.map((reward) => (
                        <Card
                            key={reward.id}
                            className={`bg-white/5 border-white/10 backdrop-blur ${!reward.is_active ? "opacity-50" : ""}`}
                        >
                            <CardContent className="pt-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl">{reward.image_url}</span>
                                        <div>
                                            <h4 className="text-white font-medium">{reward.name}</h4>
                                            <p className="text-xs text-gray-500">
                                                {categoryLabels[reward.category] || reward.category}
                                            </p>
                                        </div>
                                    </div>
                                    {!reward.is_active && (
                                        <Badge className="bg-red-500/20 text-red-300">非表示</Badge>
                                    )}
                                </div>

                                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                    {reward.description}
                                </p>

                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-lg font-bold text-yellow-400">
                                        {reward.points_required.toLocaleString()} pt
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        在庫: {reward.stock === null ? "無制限" : reward.stock}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditModal(reward)}
                                        className="flex-1 bg-white/10 text-white border-white/20"
                                    >
                                        ✏️ 編集
                                    </Button>
                                    {reward.is_active && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(reward.id)}
                                            className="bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                        >
                                            🗑️
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>

            {/* 編集モーダル */}
            <Dialog open={!!editReward} onOpenChange={() => setEditReward(null)}>
                <DialogContent className="bg-slate-800 border-white/10 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isNew ? "新規報酬の追加" : "報酬を編集"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="text-gray-200">
                                報酬名 <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="例: Amazonギフトカード 500円分"
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-200">説明</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="報酬の詳細説明"
                                className="bg-white/10 border-white/20 text-white min-h-[80px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-200">カテゴリ</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-white/10">
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-200">アイコン</Label>
                                <Select
                                    value={formData.image_url}
                                    onValueChange={(value) => setFormData({ ...formData, image_url: value })}
                                >
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-white/10">
                                        {emojis.map((emoji) => (
                                            <SelectItem key={emoji} value={emoji}>
                                                {emoji}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-200">
                                    必要ポイント <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.points_required}
                                    onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white"
                                    min="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-200">在庫数（空欄で無制限）</Label>
                                <Input
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    placeholder="無制限"
                                    className="bg-white/10 border-white/20 text-white"
                                    min="0"
                                />
                            </div>
                        </div>

                        {!isNew && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="is_active" className="text-gray-200">
                                    カタログに表示する
                                </Label>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setEditReward(null)}
                                className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving || !formData.name || !formData.points_required}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                {saving ? "保存中..." : "保存"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
