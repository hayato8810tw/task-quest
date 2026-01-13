"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/api";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get("registered");
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await login(employeeId, password);

            if (result.success && result.data) {
                localStorage.setItem("token", result.data.token);
                localStorage.setItem("user", JSON.stringify(result.data.user));
                router.push("/dashboard");
            } else {
                setError(result.error || "ログインに失敗しました");
            }
        } catch (err) {
            setError("サーバーに接続できません");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <span className="text-5xl">🎮</span>
                </div>
                <CardTitle className="text-2xl text-white">TaskQuest</CardTitle>
                <CardDescription className="text-gray-300">
                    社員IDとパスワードでログイン
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {registered && (
                        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
                            登録が完了しました。ログインしてください。
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="employeeId" className="text-gray-200">社員ID</Label>
                        <Input
                            id="employeeId"
                            type="text"
                            placeholder="例: EMP001"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-200">パスワード</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="パスワードを入力"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        disabled={loading}
                    >
                        {loading ? "ログイン中..." : "ログイン"}
                    </Button>
                </form>

                <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-2">デモアカウント:</p>
                    <div className="text-xs text-gray-300 space-y-1">
                        <p>👤 一般: <code className="bg-white/10 px-1 rounded">EMP001</code></p>
                        <p>👔 マネージャー: <code className="bg-white/10 px-1 rounded">MGR001</code></p>
                        <p>🔑 管理者: <code className="bg-white/10 px-1 rounded">ADMIN001</code></p>
                        <p className="text-gray-400 mt-2">パスワード: <code className="bg-white/10 px-1 rounded">password123</code></p>
                    </div>
                </div>

                <div className="text-center pt-4 border-t border-white/10">
                    <p className="text-gray-400 text-sm">
                        新しい社員ですか？{" "}
                        <Link href="/register" className="text-purple-400 hover:text-purple-300">
                            新規登録
                        </Link>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <Suspense fallback={<div className="text-white">読み込み中...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
