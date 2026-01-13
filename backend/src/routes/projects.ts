import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// プロジェクト一覧取得
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const projects = await prisma.project.findMany({
            where: { isArchived: false },
            include: {
                epics: {
                    where: { isArchived: false },
                    include: {
                        tasks: {
                            where: { isArchived: false },
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        displayName: true,
                        department: true
                    }
                }
            }
        });

        // 各プロジェクトの進捗を計算し、最新タスク追加日を取得
        const projectsWithProgress = projects.map(project => {
            let totalTasks = 0;
            let completedTasks = 0;
            let inProgressTasks = 0;
            let latestTaskDate: Date | null = null;

            project.epics.forEach(epic => {
                totalTasks += epic.tasks.length;
                completedTasks += epic.tasks.filter(t => t.status === 'COMPLETED').length;
                inProgressTasks += epic.tasks.filter(t => t.status === 'IN_PROGRESS').length;

                // 最新のタスク作成日を取得
                epic.tasks.forEach(task => {
                    if (!latestTaskDate || task.createdAt > latestTaskDate) {
                        latestTaskDate = task.createdAt;
                    }
                });
            });

            return {
                id: project.id,
                title: project.title,
                description: project.description,
                status: project.status,
                created_by: project.createdBy,
                creator_name: project.creator.displayName,
                epic_count: project.epics.length,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                in_progress_tasks: inProgressTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                created_at: project.createdAt,
                latest_task_at: latestTaskDate
            };
        });

        // 最新タスク追加日順でソート（タスクがないプロジェクトはプロジェクト作成日でフォールバック）
        projectsWithProgress.sort((a, b) => {
            const dateA = a.latest_task_at || a.created_at;
            const dateB = b.latest_task_at || b.created_at;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        res.json({
            success: true,
            data: projectsWithProgress
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// プロジェクト詳細取得
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                epics: {
                    include: {
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
                            }
                        },
                        creator: {
                            select: {
                                id: true,
                                displayName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                creator: {
                    select: {
                        id: true,
                        displayName: true,
                        department: true
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // エピックとタスクを整形
        const epics = project.epics.map(epic => {
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

            return {
                id: epic.id,
                title: epic.title,
                description: epic.description,
                status: epic.status,
                creator_name: epic.creator.displayName,
                tasks,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            };
        });

        let totalTasks = 0;
        let completedTasks = 0;
        epics.forEach(epic => {
            totalTasks += epic.total_tasks;
            completedTasks += epic.completed_tasks;
        });

        res.json({
            success: true,
            data: {
                id: project.id,
                title: project.title,
                description: project.description,
                status: project.status,
                creator_name: project.creator.displayName,
                epics,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                created_at: project.createdAt
            }
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// プロジェクト作成
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        const project = await prisma.project.create({
            data: {
                title,
                description: description || '',
                createdBy: userId
            }
        });

        res.status(201).json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// プロジェクト更新
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, status } = req.body;

        const project = await prisma.project.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(status && { status })
            }
        });

        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// プロジェクト削除
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.project.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Project deleted'
        });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
