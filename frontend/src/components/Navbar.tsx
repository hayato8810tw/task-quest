"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

interface User {
    id: string;
    display_name: string;
    level: number;
    available_points: number;
    role: string;
}

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    const navItems = [
        { href: "/dashboard", label: "ダッシュボード", icon: "🏠" },
        { href: "/projects", label: "プロジェクト", icon: "📁" },
        { href: "/tasks", label: "タスク", icon: "📋" },
        { href: "/leaderboard", label: "ランキング", icon: "🏆" },
        { href: "/badges", label: "バッジ", icon: "🎖️" },
        { href: "/rewards", label: "報酬", icon: "🎁" },
    ];

    const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";

    return (
        <header className="border-b border-white/10 backdrop-blur-lg bg-white/5 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <span className="text-2xl">🎮</span>
                        <h1 className="text-xl font-bold text-white">TaskQuest</h1>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant="ghost"
                                    className={`text-gray-300 hover:text-white hover:bg-white/10 ${pathname === item.href ? "bg-white/10 text-white" : ""
                                        }`}
                                >
                                    <span className="mr-1">{item.icon}</span>
                                    {item.label}
                                </Button>
                            </Link>
                        ))}
                        {isManager && (
                            <>
                                <Link href="/tasks/new">
                                    <Button className="ml-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                        + タスク作成
                                    </Button>
                                </Link>
                            </>
                        )}
                        <Link href="/archives">
                            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                                📦 アーカイブ
                            </Button>
                        </Link>
                    </nav>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-sm">
                            <span className="text-yellow-400">💰</span>
                            <span className="text-white font-medium">
                                {user?.available_points?.toLocaleString() || 0} pt
                            </span>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-purple-600 text-white text-sm">
                                            {user?.display_name?.charAt(0) || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden md:inline text-gray-300">
                                        {user?.display_name}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-white/10">
                                <DropdownMenuItem className="text-gray-300">
                                    <span className="mr-2">⚔️</span>
                                    Lv.{user?.level || 1}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem asChild className="text-gray-300 cursor-pointer">
                                    <Link href="/profile">
                                        <span className="mr-2">👤</span>
                                        プロフィール
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-red-400 cursor-pointer"
                                >
                                    <span className="mr-2">🚪</span>
                                    ログアウト
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
}
