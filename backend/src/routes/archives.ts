import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// アーカイブ済みタスク取得（月別）- 全ユーザー閲覧可能
router.get('/tasks', authMiddleware, async (req: Request, res: Response) => {
    try {

        const tasks = await prisma.task.findMany({
            where: { isArchived: true },
            include: {
                creator: { select: { displayName: true } },
                epic: { select: { title: true, project: { select: { title: true } } } },
                taskAssignments: {
                    include: { user: { select: { displayName: true } } }
                }
            },
            orderBy: { archivedAt: 'desc' }
        });

        // 月別にグルーピング
        const grouped: Record<string, any[]> = {};
        tasks.forEach(task => {
            const date = task.archivedAt || task.completedAt || task.createdAt;
            const monthKey = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push({
                id: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: task.status,
                base_points: task.basePoints,
                completed_at: task.completedAt,
                archived_at: task.archivedAt,
                creator_name: task.creator.displayName,
                project_name: task.epic?.project?.title || null,
                epic_name: task.epic?.title || null,
                assigned_to: task.taskAssignments.map(ta => ta.user.displayName)
            });
        });

        res.json({
            success: true,
            data: grouped
        });
    } catch (error) {
        console.error('Get archived tasks error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// アーカイブ済みエピック取得 - 全ユーザー閲覧可能
router.get('/epics', authMiddleware, async (req: Request, res: Response) => {
    try {

        const epics = await prisma.epic.findMany({
            where: { isArchived: true },
            include: {
                creator: { select: { displayName: true } },
                project: { select: { title: true } },
                tasks: { select: { id: true, status: true } }
            },
            orderBy: { archivedAt: 'desc' }
        });

        res.json({
            success: true,
            data: epics.map(e => ({
                id: e.id,
                title: e.title,
                description: e.description,
                status: e.status,
                project_name: e.project.title,
                creator_name: e.creator.displayName,
                task_count: e.tasks.length,
                completed_count: e.tasks.filter(t => t.status === 'COMPLETED').length,
                archived_at: e.archivedAt
            }))
        });
    } catch (error) {
        console.error('Get archived epics error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// アーカイブ済みプロジェクト取得 - 全ユーザー閲覧可能
router.get('/projects', authMiddleware, async (req: Request, res: Response) => {
    try {

        const projects = await prisma.project.findMany({
            where: { isArchived: true },
            include: {
                creator: { select: { displayName: true } },
                epics: {
                    select: {
                        id: true,
                        tasks: { select: { id: true, status: true } }
                    }
                }
            },
            orderBy: { archivedAt: 'desc' }
        });

        res.json({
            success: true,
            data: projects.map(p => {
                const allTasks = p.epics.flatMap(e => e.tasks);
                return {
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    status: p.status,
                    creator_name: p.creator.displayName,
                    epic_count: p.epics.length,
                    task_count: allTasks.length,
                    completed_count: allTasks.filter(t => t.status === 'COMPLETED').length,
                    archived_at: p.archivedAt
                };
            })
        });
    } catch (error) {
        console.error('Get archived projects error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// アーカイブ実行
router.post('/:type/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { type, id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const archivedAt = new Date();

        if (type === 'tasks') {
            await prisma.task.update({
                where: { id },
                data: { isArchived: true, archivedAt }
            });
        } else if (type === 'epics') {
            await prisma.epic.update({
                where: { id },
                data: { isArchived: true, archivedAt }
            });
        } else if (type === 'projects') {
            await prisma.project.update({
                where: { id },
                data: { isArchived: true, archivedAt }
            });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid type' });
        }

        res.json({ success: true, message: 'Archived successfully' });
    } catch (error) {
        console.error('Archive error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// アーカイブ解除
router.delete('/:type/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { type, id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        if (type === 'tasks') {
            await prisma.task.update({
                where: { id },
                data: { isArchived: false, archivedAt: null }
            });
        } else if (type === 'epics') {
            await prisma.epic.update({
                where: { id },
                data: { isArchived: false, archivedAt: null }
            });
        } else if (type === 'projects') {
            await prisma.project.update({
                where: { id },
                data: { isArchived: false, archivedAt: null }
            });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid type' });
        }

        res.json({ success: true, message: 'Unarchived successfully' });
    } catch (error) {
        console.error('Unarchive error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 完了済みアイテム取得（アーカイブ対象候補）
router.get('/candidates/:type', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { type } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        if (type === 'tasks') {
            const tasks = await prisma.task.findMany({
                where: { status: 'COMPLETED', isArchived: false },
                include: {
                    creator: { select: { displayName: true } },
                    epic: { select: { title: true, project: { select: { title: true } } } }
                },
                orderBy: { completedAt: 'desc' }
            });
            res.json({
                success: true,
                data: tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    completed_at: t.completedAt,
                    project_name: t.epic?.project?.title,
                    epic_name: t.epic?.title
                }))
            });
        } else if (type === 'epics') {
            const epics = await prisma.epic.findMany({
                where: { status: 'COMPLETED', isArchived: false },
                include: { project: { select: { title: true } } },
                orderBy: { updatedAt: 'desc' }
            });
            res.json({
                success: true,
                data: epics.map(e => ({
                    id: e.id,
                    title: e.title,
                    project_name: e.project.title
                }))
            });
        } else if (type === 'projects') {
            const projects = await prisma.project.findMany({
                where: { status: 'COMPLETED', isArchived: false },
                orderBy: { updatedAt: 'desc' }
            });
            res.json({
                success: true,
                data: projects.map(p => ({
                    id: p.id,
                    title: p.title
                }))
            });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid type' });
        }
    } catch (error) {
        console.error('Get candidates error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
