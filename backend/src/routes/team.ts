import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 部署のメンバー一覧（マネージャー用）
router.get('/members', authMiddleware, requireRole('MANAGER', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const userRole = (req as any).userRole;

        // 現在のユーザーの部署を取得
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        // 管理者は全員、マネージャーは同じ部署のメンバーのみ
        const where = userRole === 'ADMIN'
            ? {}
            : { department: currentUser?.department };

        const members = await prisma.user.findMany({
            where,
            select: {
                id: true,
                employeeId: true,
                displayName: true,
                email: true,
                department: true,
                role: true,
                level: true,
                totalPoints: true,
                availablePoints: true,
            },
            orderBy: { displayName: 'asc' }
        });

        res.json({
            success: true,
            data: members.map(m => ({
                id: m.id,
                employee_id: m.employeeId,
                display_name: m.displayName,
                email: m.email,
                department: m.department,
                role: m.role,
                level: m.level,
                total_points: m.totalPoints,
                available_points: m.availablePoints,
            }))
        });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// チーム全体のタスク一覧（マネージャー用）
router.get('/tasks', authMiddleware, requireRole('MANAGER', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const userRole = (req as any).userRole;
        const { status, assignee } = req.query;

        // 現在のユーザーの部署を取得
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        // 部署のメンバーIDを取得
        const memberIds = userRole === 'ADMIN'
            ? undefined
            : (await prisma.user.findMany({
                where: { department: currentUser?.department },
                select: { id: true }
            })).map(u => u.id);

        // タスク取得条件
        const where: any = {};

        if (memberIds) {
            where.taskAssignments = {
                some: { userId: { in: memberIds } }
            };
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        if (assignee && assignee !== 'all') {
            where.taskAssignments = {
                ...where.taskAssignments,
                some: { ...where.taskAssignments?.some, userId: assignee }
            };
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                creator: { select: { id: true, displayName: true } },
                taskAssignments: {
                    include: {
                        user: { select: { id: true, displayName: true, department: true } }
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { deadline: 'asc' }
            ]
        });

        res.json({
            success: true,
            data: tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                difficulty: task.difficulty,
                base_points: task.basePoints,
                bonus_xp: task.bonusXp,
                deadline: task.deadline,
                status: task.status,
                tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags,
                created_at: task.createdAt,
                created_by: {
                    id: task.creator.id,
                    display_name: task.creator.displayName
                },
                assigned_to: task.taskAssignments.map(ta => ({
                    id: ta.user.id,
                    display_name: ta.user.displayName,
                    department: ta.user.department
                }))
            }))
        });
    } catch (error) {
        console.error('Get team tasks error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// チームの統計情報
router.get('/stats', authMiddleware, requireRole('MANAGER', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const userRole = (req as any).userRole;

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        const where = userRole === 'ADMIN' ? {} : { department: currentUser?.department };

        const members = await prisma.user.findMany({
            where,
            select: { id: true }
        });
        const memberIds = members.map(m => m.id);

        // タスク統計
        const [pending, inProgress, completed] = await Promise.all([
            prisma.task.count({
                where: { taskAssignments: { some: { userId: { in: memberIds } } }, status: 'PENDING' }
            }),
            prisma.task.count({
                where: { taskAssignments: { some: { userId: { in: memberIds } } }, status: 'IN_PROGRESS' }
            }),
            prisma.task.count({
                where: { taskAssignments: { some: { userId: { in: memberIds } } }, status: 'COMPLETED' }
            })
        ]);

        res.json({
            success: true,
            data: {
                member_count: memberIds.length,
                tasks_pending: pending,
                tasks_in_progress: inProgress,
                tasks_completed: completed,
                department: currentUser?.department
            }
        });
    } catch (error) {
        console.error('Get team stats error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
