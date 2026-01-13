import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// エピック一覧取得
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;

        const where: any = { isArchived: false };
        if (projectId) where.projectId = projectId as string;

        const epics = await prisma.epic.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                tasks: true,
                creator: {
                    select: {
                        id: true,
                        displayName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const epicsWithProgress = epics.map(epic => {
            const totalTasks = epic.tasks.length;
            const completedTasks = epic.tasks.filter(t => t.status === 'COMPLETED').length;
            const inProgressTasks = epic.tasks.filter(t => t.status === 'IN_PROGRESS').length;

            return {
                id: epic.id,
                title: epic.title,
                description: epic.description,
                status: epic.status,
                project_id: epic.projectId,
                project_title: epic.project.title,
                creator_name: epic.creator.displayName,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                in_progress_tasks: inProgressTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                created_at: epic.createdAt
            };
        });

        res.json({
            success: true,
            data: epicsWithProgress
        });
    } catch (error) {
        console.error('Get epics error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// エピック詳細取得
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const epic = await prisma.epic.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                tasks: {
                    include: {
                        taskAssignments: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        displayName: true,
                                        department: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                creator: {
                    select: {
                        id: true,
                        displayName: true
                    }
                }
            }
        });

        if (!epic) {
            return res.status(404).json({
                success: false,
                error: 'Epic not found'
            });
        }

        const tasks = epic.tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            base_points: task.basePoints,
            bonus_xp: task.bonusXp,
            difficulty: task.difficulty,
            deadline: task.deadline,
            assigned_to: task.taskAssignments.map(ta => ({
                id: ta.user.id,
                display_name: ta.user.displayName,
                department: ta.user.department
            }))
        }));

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;

        res.json({
            success: true,
            data: {
                id: epic.id,
                title: epic.title,
                description: epic.description,
                status: epic.status,
                project_id: epic.projectId,
                project_title: epic.project.title,
                creator_name: epic.creator.displayName,
                tasks,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                created_at: epic.createdAt
            }
        });
    } catch (error) {
        console.error('Get epic error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// エピック作成
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { title, description, projectId } = req.body;

        if (!title || !projectId) {
            return res.status(400).json({
                success: false,
                error: 'Title and projectId are required'
            });
        }

        // プロジェクトの存在確認
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const epic = await prisma.epic.create({
            data: {
                title,
                description: description || '',
                projectId,
                createdBy: userId
            }
        });

        res.status(201).json({
            success: true,
            data: epic
        });
    } catch (error) {
        console.error('Create epic error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// エピック更新
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, status } = req.body;

        const epic = await prisma.epic.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(status && { status })
            }
        });

        res.json({
            success: true,
            data: epic
        });
    } catch (error) {
        console.error('Update epic error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// エピック削除
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.epic.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Epic deleted'
        });
    } catch (error) {
        console.error('Delete epic error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
