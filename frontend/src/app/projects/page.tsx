"use client";
import { API_BASE_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Project {
    id: string;
    title: string;
    description: string;
    status: string;
    creator_name: string;
    epic_count: number;
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    progress: number;
    created_at: string;
}

interface TeamMember {
    id: string;
    display_name: string;
    department: string;
    level: number;
    role: string;
    email?: string;
    employee_id?: string;
}

interface TeamStats {
    member_count: number;
    tasks_pending: number;
    tasks_in_progress: number;
    tasks_completed: number;
    total_tasks: number;
}

interface Department {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("");
    const [viewMode, setViewMode] = useState<"projects" | "members" | "departments">("projects");

    // 編集モーダル用
    const [editMember, setEditMember] = useState<TeamMember | null>(null);
    const [editForm, setEditForm] = useState({
        display_name: "",
        department: "",
        role: "",
        email: "",
    });
    const [saving, setSaving] = useState(false);

    // 部署管理用
    const [departmentList, setDepartmentList] = useState<Department[]>([]);
    const [editDepartment, setEditDepartment] = useState<Department | null>(null);
    const [newDepartment, setNewDepartment] = useState({ name: "", description: "" });
    const [showNewDeptForm, setShowNewDeptForm] = useState(false);

    // 部署選択肢（API取得＋デフォルト）
    const departments = departmentList.length > 0
        ? departmentList.map(d => d.name)
        : [
            "経営企画部",
            "営業部",
            "マーケティング部",
            "開発部",
            "人事部",
            "総務部",
            "経理部",
            "カスタマーサポート部",
        ];

    // ユーザーのタスク一覧
    interface UserTask {
        id: string;
        status: string;
        epic?: { project?: { id: string } } | null;
    }
    const [userTasks, setUserTasks] = useState<UserTask[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    // ユーザーのタスクでプロジェクト別カウントを計算
    const getMyTaskCounts = (projectId: string) => {
        const projectTasks = userTasks.filter(t => t.epic?.project?.id === projectId);
        return {
            total: projectTasks.length,
            pending: projectTasks.filter(t => t.status === "PENDING").length,
            inProgress: projectTasks.filter(t => t.status === "IN_PROGRESS").length,
            completed: projectTasks.filter(t => t.status === "COMPLETED").length,
        };
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
            setCurrentUserId(user.id || "");
        }

        const fetchData = async () => {
            try {
                // プロジェクトとタスクを取得
                const [projectsRes, tasksRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/projects`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${API_BASE_URL}/tasks`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);
                const [projectsData, tasksData] = await Promise.all([
                    projectsRes.json(),
                    tasksRes.json(),
                ]);
                if (projectsData.success) {
                    setProjects(projectsData.data);
                }
                if (tasksData.success) {
                    setUserTasks(tasksData.data);
                }

                const user = userData ? JSON.parse(userData) : null;
                if (user?.role === "MANAGER" || user?.role === "ADMIN") {
                    const [membersRes, statsRes] = await Promise.all([
                        fetch(`${API_BASE_URL}/team/members`, {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                        fetch(`${API_BASE_URL}/team/stats`, {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                    ]);

                    const [membersData, statsData] = await Promise.all([
                        membersRes.json(),
                        statsRes.json(),
                    ]);

                    if (membersData.success) setMembers(membersData.data);
                    if (statsData.success) setStats(statsData.data);
                }

                // 部署一覧取得（常に取得）
                const deptsRes = await fetch(`${API_BASE_URL}/departments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const deptsData = await deptsRes.json();
                if (deptsData.success) setDepartmentList(deptsData.data);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const isManager = userRole === "MANAGER" || userRole === "ADMIN";

    const openEditModal = (member: TeamMember) => {
        setEditMember(member);
        setEditForm({
            display_name: member.display_name || "",
            department: member.department || "",
            role: member.role || "USER",
            email: member.email || "",
        });
    };

    const handleSave = async () => {
        if (!editMember) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/${editMember.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editForm),
            });

            const data = await res.json();
            if (data.success) {
                // メンバーリストを更新
                setMembers(members.map(m =>
                    m.id === editMember.id
                        ? { ...m, ...editForm }
                        : m
                ));
                setEditMember(null);
            } else {
                alert(data.error || "更新に失敗しました");
            }
        } catch (error) {
            console.error("Failed to update user:", error);
            alert("更新に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    const statusColors: Record<string, string> = {
        ACTIVE: "bg-green-500/20 text-green-300",
        COMPLETED: "bg-blue-500/20 text-blue-300",
        ARCHIVED: "bg-gray-500/20 text-gray-300",
    };

    const statusLabels: Record<string, string> = {
        ACTIVE: "進行中",
        COMPLETED: "完了",
        ARCHIVED: "アーカイブ",
    };

    const totalTasks = projects.reduce((sum, p) => sum + p.total_tasks, 0);
    const completedTasks = projects.reduce((sum, p) => sum + p.completed_tasks, 0);
    const inProgressTasks = projects.reduce((sum, p) => sum + p.in_progress_tasks, 0);
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
                            📁 プロジェクト管理
                        </h2>
                        <p className="text-gray-400">プロジェクト・エピック・タスクをチームで管理</p>
                    </div>
                    {isManager && (
                        <Button
                            onClick={() => router.push("/projects/new")}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            + 新規プロジェクト
                        </Button>
                    )}
                </div>

                {/* 統計サマリー（チーム + 個人） */}
                {(() => {
                    // 個人タスク統計を計算
                    const myPending = userTasks.filter(t => t.status === "PENDING").length;
                    const myInProgress = userTasks.filter(t => t.status === "IN_PROGRESS").length;
                    const myCompleted = userTasks.filter(t => t.status === "COMPLETED").length;
                    const myTotal = myPending + myInProgress + myCompleted;
                    const myProgress = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0;

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* 個人タスク統計 */}
                            <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/30 backdrop-blur">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-white text-base flex items-center gap-2">
                                        👤 あなたのタスク
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-4 gap-2 text-center mb-3">
                                        <div className="bg-white/10 rounded-lg p-2">
                                            <div className="text-2xl font-bold text-white">{myTotal}</div>
                                            <div className="text-xs text-gray-400">全体</div>
                                        </div>
                                        <div className="bg-white/10 rounded-lg p-2">
                                            <div className="text-2xl font-bold text-yellow-400">{myPending}</div>
                                            <div className="text-xs text-gray-400">未着手</div>
                                        </div>
                                        <div className="bg-white/10 rounded-lg p-2">
                                            <div className="text-2xl font-bold text-cyan-400">{myInProgress}</div>
                                            <div className="text-xs text-gray-400">進行中</div>
                                        </div>
                                        <div className="bg-white/10 rounded-lg p-2">
                                            <div className="text-2xl font-bold text-green-400">{myCompleted}</div>
                                            <div className="text-xs text-gray-400">完了</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-300 mb-1">
                                        <span>進捗</span>
                                        <span>{myProgress}%</span>
                                    </div>
                                    <Progress value={myProgress} className="h-2 bg-purple-900/50" indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-400" />
                                </CardContent>
                            </Card>

                            {/* チーム全体統計（マネージャー以上のみ） */}
                            {isManager && stats ? (
                                <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-blue-500/30 backdrop-blur">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-white text-base flex items-center gap-2">
                                            👥 チーム全体
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-4 gap-2 text-center mb-3">
                                            <div className="bg-white/10 rounded-lg p-2">
                                                <div className="text-2xl font-bold text-white">{stats.tasks_pending + stats.tasks_in_progress + stats.tasks_completed}</div>
                                                <div className="text-xs text-gray-400">全体</div>
                                            </div>
                                            <div className="bg-white/10 rounded-lg p-2">
                                                <div className="text-2xl font-bold text-yellow-400">{stats.tasks_pending}</div>
                                                <div className="text-xs text-gray-400">未着手</div>
                                            </div>
                                            <div className="bg-white/10 rounded-lg p-2">
                                                <div className="text-2xl font-bold text-cyan-400">{stats.tasks_in_progress}</div>
                                                <div className="text-xs text-gray-400">進行中</div>
                                            </div>
                                            <div className="bg-white/10 rounded-lg p-2">
                                                <div className="text-2xl font-bold text-green-400">{stats.tasks_completed}</div>
                                                <div className="text-xs text-gray-400">完了</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-300 mb-1">
                                            <span>進捗（{stats.member_count}人）</span>
                                            <span>{(stats.tasks_pending + stats.tasks_in_progress + stats.tasks_completed) > 0 ? Math.round((stats.tasks_completed / (stats.tasks_pending + stats.tasks_in_progress + stats.tasks_completed)) * 100) : 0}%</span>
                                        </div>
                                        <Progress value={(stats.tasks_pending + stats.tasks_in_progress + stats.tasks_completed) > 0 ? Math.round((stats.tasks_completed / (stats.tasks_pending + stats.tasks_in_progress + stats.tasks_completed)) * 100) : 0} className="h-2 bg-blue-900/50" indicatorClassName="bg-gradient-to-r from-blue-500 to-cyan-400" />
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="bg-white/5 border-white/10 backdrop-blur">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-white text-base flex items-center gap-2">
                                            📁 プロジェクト概要
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="bg-white/10 rounded-lg p-3">
                                                <div className="text-3xl font-bold text-purple-400">{projects.length}</div>
                                                <div className="text-sm text-gray-400">プロジェクト</div>
                                            </div>
                                            <div className="bg-white/10 rounded-lg p-3">
                                                <div className="text-3xl font-bold text-blue-400">{projects.reduce((sum, p) => sum + p.epic_count, 0)}</div>
                                                <div className="text-sm text-gray-400">エピック</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    );
                })()}

                {/* 表示切り替え */}
                {isManager && (
                    <div className="flex gap-2 mb-6">
                        <Button
                            variant={viewMode === "projects" ? "default" : "outline"}
                            onClick={() => setViewMode("projects")}
                            className={viewMode === "projects"
                                ? "bg-white text-slate-900 hover:bg-gray-100"
                                : "bg-purple-600/20 text-purple-300 border-purple-500/30 hover:bg-purple-600/30"}
                        >
                            📁 プロジェクト一覧
                        </Button>
                        <Button
                            variant={viewMode === "members" ? "default" : "outline"}
                            onClick={() => setViewMode("members")}
                            className={viewMode === "members"
                                ? "bg-white text-slate-900 hover:bg-gray-100"
                                : "bg-purple-600/20 text-purple-300 border-purple-500/30 hover:bg-purple-600/30"}
                        >
                            👥 メンバー一覧
                        </Button>
                        {userRole === "ADMIN" && (
                            <Button
                                variant={viewMode === "departments" ? "default" : "outline"}
                                onClick={() => setViewMode("departments")}
                                className={viewMode === "departments"
                                    ? "bg-white text-slate-900 hover:bg-gray-100"
                                    : "bg-purple-600/20 text-purple-300 border-purple-500/30 hover:bg-purple-600/30"}
                            >
                                🏢 部署一覧
                            </Button>
                        )}
                    </div>
                )}

                {/* プロジェクト一覧 */}
                {viewMode === "projects" && (
                    <>
                        {projects.length === 0 ? (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-400 mb-4">プロジェクトがありません</p>
                                    {isManager && (
                                        <Button
                                            onClick={() => router.push("/projects/new")}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            最初のプロジェクトを作成
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {projects.map((project) => (
                                    <Card
                                        key={project.id}
                                        className="bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    >
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-white text-lg flex items-center gap-2">
                                                    📁 {project.title}
                                                </CardTitle>
                                                <Badge className={statusColors[project.status]}>
                                                    {statusLabels[project.status] || project.status}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                                {project.description || "説明なし"}
                                            </p>
                                            {/* 自分の進捗表示 */}
                                            {(() => {
                                                const myCounts = getMyTaskCounts(project.id);
                                                const myProgress = myCounts.total > 0 ? Math.round((myCounts.completed / myCounts.total) * 100) : 0;
                                                return (
                                                    <>
                                                        <div className="mb-4">
                                                            <div className="flex justify-between text-sm text-gray-300 mb-1">
                                                                <span>あなたの進捗</span>
                                                                <span>{myProgress}% ({myCounts.completed}/{myCounts.total}件)</span>
                                                            </div>
                                                            <Progress value={myProgress} className="h-2 bg-blue-900/50" indicatorClassName="bg-gradient-to-r from-blue-500 to-cyan-400" />
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2 text-center">
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <div className="text-lg font-bold text-purple-400">
                                                                    {project.epic_count}
                                                                </div>
                                                                <div className="text-xs text-gray-400">エピック</div>
                                                            </div>
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <div className="text-lg font-bold text-yellow-400">
                                                                    {myCounts.pending}
                                                                </div>
                                                                <div className="text-xs text-gray-400">未着手</div>
                                                            </div>
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <div className="text-lg font-bold text-blue-400">
                                                                    {myCounts.inProgress}
                                                                </div>
                                                                <div className="text-xs text-gray-400">進行中</div>
                                                            </div>
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <div className="text-lg font-bold text-green-400">
                                                                    {myCounts.completed}
                                                                </div>
                                                                <div className="text-xs text-gray-400">完了</div>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                            <div className="mt-3 text-xs text-gray-500">
                                                作成者: {project.creator_name}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* メンバー一覧（マネージャー以上） */}
                {viewMode === "members" && isManager && (
                    <div className="space-y-6">
                        {Object.entries(
                            members.reduce((groups, member) => {
                                const dept = member.department || "その他";
                                if (!groups[dept]) groups[dept] = [];
                                groups[dept].push(member);
                                return groups;
                            }, {} as Record<string, TeamMember[]>)
                        ).sort(([a], [b]) => a.localeCompare(b)).map(([department, deptMembers]) => (
                            <div key={department}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🏢</span>
                                    <h3 className="text-lg font-bold text-white">{department}</h3>
                                    <Badge className="bg-purple-500/20 text-purple-300">
                                        {deptMembers.length}人
                                    </Badge>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {deptMembers.map((member) => (
                                        <Card key={member.id} className="bg-white/5 border-white/10 backdrop-blur">
                                            <CardContent className="py-4">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarFallback className="bg-purple-600 text-white">
                                                            {member.display_name?.charAt(0) || "?"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-medium">{member.display_name}</span>
                                                            <Badge className="bg-purple-500/20 text-purple-300">
                                                                Lv.{member.level}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {member.role === "MANAGER" ? "👔 マネージャー" :
                                                                member.role === "ADMIN" ? "👑 管理者" : "👤 ユーザー"}
                                                        </div>
                                                    </div>
                                                    {/* 編集ボタン */}
                                                    {(userRole === "ADMIN" || (userRole === "MANAGER" && member.role !== "ADMIN")) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditModal(member)}
                                                            className="text-gray-400 hover:text-white"
                                                        >
                                                            ✏️
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 部署一覧 */}
                {viewMode === "departments" && userRole === "ADMIN" && (
                    <div className="space-y-4">
                        {/* 新規部署追加 */}
                        {!showNewDeptForm ? (
                            <Button
                                onClick={() => setShowNewDeptForm(true)}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                + 新規部署を追加
                            </Button>
                        ) : (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardContent className="p-4">
                                    <div className="flex items-end gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-gray-200">部署名</Label>
                                            <Input
                                                value={newDepartment.name}
                                                onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                                                placeholder="例: 開発部"
                                                className="bg-white/10 border-white/20 text-white"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-gray-200">説明（任意）</Label>
                                            <Input
                                                value={newDepartment.description}
                                                onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                                                placeholder="例: ソフトウェア開発を担当"
                                                className="bg-white/10 border-white/20 text-white"
                                            />
                                        </div>
                                        <Button
                                            onClick={async () => {
                                                if (!newDepartment.name) return;
                                                const token = localStorage.getItem("token");
                                                if (!token) return;
                                                try {
                                                    const res = await fetch(`${API_BASE_URL}/departments`, {
                                                        method: "POST",
                                                        headers: {
                                                            "Content-Type": "application/json",
                                                            Authorization: `Bearer ${token}`
                                                        },
                                                        body: JSON.stringify(newDepartment),
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        setDepartmentList([...departmentList, data.data]);
                                                        setNewDepartment({ name: "", description: "" });
                                                        setShowNewDeptForm(false);
                                                    } else {
                                                        alert(data.error || "作成に失敗しました");
                                                    }
                                                } catch (error) {
                                                    alert("エラーが発生しました");
                                                }
                                            }}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            作成
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setShowNewDeptForm(false); setNewDepartment({ name: "", description: "" }); }}
                                            className="bg-slate-700 text-white border-slate-600"
                                        >
                                            キャンセル
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* 部署リスト */}
                        {departmentList.length === 0 ? (
                            <Card className="bg-white/5 border-white/10 backdrop-blur">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-400">部署がありません</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {departmentList.map((dept) => (
                                    <Card key={dept.id} className="bg-white/5 border-white/10 backdrop-blur">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            {editDepartment?.id === dept.id ? (
                                                <div className="flex items-center gap-4 flex-1">
                                                    <Input
                                                        value={editDepartment.name}
                                                        onChange={(e) => setEditDepartment({ ...editDepartment, name: e.target.value })}
                                                        className="bg-white/10 border-white/20 text-white"
                                                    />
                                                    <Input
                                                        value={editDepartment.description || ""}
                                                        onChange={(e) => setEditDepartment({ ...editDepartment, description: e.target.value })}
                                                        placeholder="説明"
                                                        className="bg-white/10 border-white/20 text-white"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={async () => {
                                                            const token = localStorage.getItem("token");
                                                            if (!token) return;
                                                            try {
                                                                const res = await fetch(`${API_BASE_URL}/departments/${editDepartment.id}`, {
                                                                    method: "PATCH",
                                                                    headers: {
                                                                        "Content-Type": "application/json",
                                                                        Authorization: `Bearer ${token}`
                                                                    },
                                                                    body: JSON.stringify({ name: editDepartment.name, description: editDepartment.description }),
                                                                });
                                                                const data = await res.json();
                                                                if (data.success) {
                                                                    setDepartmentList(departmentList.map(d => d.id === dept.id ? { ...d, name: editDepartment.name, description: editDepartment.description } : d));
                                                                    setEditDepartment(null);
                                                                } else {
                                                                    alert(data.error || "更新に失敗しました");
                                                                }
                                                            } catch (error) {
                                                                alert("エラーが発生しました");
                                                            }
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        保存
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setEditDepartment(null)}
                                                        className="bg-slate-700 text-white border-slate-600"
                                                    >
                                                        取消
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <h4 className="text-white font-medium">🏢 {dept.name}</h4>
                                                        {dept.description && (
                                                            <p className="text-sm text-gray-400">{dept.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditDepartment(dept)}
                                                            className="text-gray-400 hover:text-white"
                                                        >
                                                            ✏️
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={async () => {
                                                                if (!confirm(`「${dept.name}」を削除しますか？`)) return;
                                                                const token = localStorage.getItem("token");
                                                                if (!token) return;
                                                                try {
                                                                    const res = await fetch(`${API_BASE_URL}/departments/${dept.id}`, {
                                                                        method: "DELETE",
                                                                        headers: { Authorization: `Bearer ${token}` },
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.success) {
                                                                        setDepartmentList(departmentList.filter(d => d.id !== dept.id));
                                                                    } else {
                                                                        alert(data.error || "削除に失敗しました");
                                                                    }
                                                                } catch (error) {
                                                                    alert("エラーが発生しました");
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-300"
                                                        >
                                                            🗑️
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* 編集モーダル */}
            <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
                <DialogContent className="bg-slate-800 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>メンバー情報を編集</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="text-gray-200">氏名</Label>
                            <Input
                                value={editForm.display_name}
                                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-200">メールアドレス</Label>
                            <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-200">部署</Label>
                            <Select
                                value={editForm.department}
                                onValueChange={(value) => setEditForm({ ...editForm, department: value })}
                            >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue />
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
                            <Label className="text-gray-200">権限</Label>
                            <Select
                                value={editForm.role}
                                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                            >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10">
                                    <SelectItem value="USER">👤 一般ユーザー</SelectItem>
                                    <SelectItem value="MANAGER">👔 マネージャー</SelectItem>
                                    {userRole === "ADMIN" && (
                                        <SelectItem value="ADMIN">👑 管理者</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setEditMember(null)}
                                className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
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
