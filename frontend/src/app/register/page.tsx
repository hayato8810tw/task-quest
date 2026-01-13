"use client";
import { API_BASE_URL } from "@/lib/api";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        employee_id: "",
        email: "",
        password: "",
        confirmPassword: "",
        display_name: "",
        department: "",
    });

    const departments = [
        "経営企画部",
        "営業部",
        "マーケティング部",
        "開発部",
        "人事部",
        "総務部",
        "経理部",
        "カスタマーサポート部",
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("パスワードが一致しません");
            return;
        }

        if (formData.password.length < 6) {
            setError("パスワードは6文字以上で入力してください");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employee_id: formData.employee_id,
                    email: formData.email,
                    password: formData.password,
                    display_name: formData.display_name,
                    department: formData.department,
                }),
            });

            const data = await res.json();

            if (data.success) {
                router.push("/login?registered=true");
            } else {
                setError(data.error === "User already exists"
                    ? "この社員IDまたはメールアドレスは既に登録されています"
                    : data.error || "登録に失敗しました");
            }
        } catch (err) {
            setError("サーバーへの接続に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur">
                <CardHeader className="text-center">
                    <div className="text-4xl mb-2">🎮</div>
                    <CardTitle className="text-2xl text-white">TaskQuest</CardTitle>
                    <p className="text-gray-400 text-sm">新規社員登録</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="employee_id" className="text-gray-200">
                                社員ID <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="employee_id"
                                value={formData.employee_id}
                                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                placeholder="例: EMP003"
                                className="bg-white/10 border-white/20 text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="display_name" className="text-gray-200">
                                氏名 <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="display_name"
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="例: 山田 太郎"
                                className="bg-white/10 border-white/20 text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-200">
                                メールアドレス <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="例: yamada@taskquest.demo"
                                className="bg-white/10 border-white/20 text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-200">
                                部署 <span className="text-red-400">*</span>
                            </Label>
                            <Select
                                value={formData.department}
                                onValueChange={(value) => setFormData({ ...formData, department: value })}
                            >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue placeholder="部署を選択" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10">
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-200">
                                パスワード <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="6文字以上"
                                className="bg-white/10 border-white/20 text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-gray-200">
                                パスワード（確認）<span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="パスワードを再入力"
                                className="bg-white/10 border-white/20 text-white"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !formData.employee_id || !formData.email || !formData.password || !formData.display_name || !formData.department}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            {loading ? "登録中..." : "登録する"}
                        </Button>

                        <div className="text-center pt-4 border-t border-white/10">
                            <p className="text-gray-400 text-sm">
                                既にアカウントをお持ちですか？{" "}
                                <Link href="/login" className="text-purple-400 hover:text-purple-300">
                                    ログイン
                                </Link>
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
