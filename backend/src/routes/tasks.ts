import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// タスク一覧取得
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { status, priority, limit = 50, offset = 0 } = req.query;

        // 自分に割り当てられたタスクのみ（アーカイブ済みを除外）
        const where: any = {
            taskAssignments: {
                some: { userId }
            },
            isArchived: false
        };

        if (status && status !== 'all') where.status = status;
        if (priority && priority !== 'all') where.priority = priority;

        const tasks = await prisma.task.findMany({
            where,
            include: {
                creator: {
                    select: { id: true, displayName: true }
                },
                taskAssignments: {
                    include: {
                        user: { select: { id: true, displayName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
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
                scheduled_day: (task as any).scheduledDay,
                tags: task.tags,
                epicId: task.epicId,
                created_by: task.creator,
                assigned_to: task.taskAssignments.map(ta => ta.user)
            }))
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// タスク詳細取得
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, displayName: true } },
                taskAssignments: {
                    include: { user: { select: { id: true, displayName: true } } }
                }
            }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// タスク作成
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { title, description, priority, difficulty, base_points, bonus_xp, deadline, tags, assigned_to, epicId } = req.body;

        console.log('Creating task with data:', { title, description, priority, difficulty, base_points, bonus_xp, deadline, tags, assigned_to, epicId });

        // 担当者の配列を検証
        const assignees = Array.isArray(assigned_to) ? assigned_to.filter((id: string) => id && id.length > 0) : [];
        console.log('Assignees:', assignees);

        const task = await prisma.task.create({
            data: {
                title,
                description: description || '',
                createdBy: userId,
                priority: priority || 'MEDIUM',
                difficulty: difficulty || 3,
                basePoints: base_points || 100,
                bonusXp: bonus_xp || 50,
                deadline: deadline ? new Date(deadline) : null,
                tags: JSON.stringify(tags || []),
                epicId: epicId || null,
                taskAssignments: {
                    create: assignees.map((uid: string) => ({ userId: uid }))
                }
            },
            include: {
                taskAssignments: true
            }
        });

        console.log('Task created:', task.id, 'with assignments:', task.taskAssignments);

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: (error as Error).message
        });
    }
});

// タスクのエピック（配属先）変更
router.patch('/:id/epic', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { epicId } = req.body;

        const task = await prisma.task.findUnique({
            where: { id }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // エピックの存在確認（epicIdが指定されている場合）
        if (epicId) {
            const epic = await prisma.epic.findUnique({
                where: { id: epicId }
            });
            if (!epic) {
                return res.status(404).json({
                    success: false,
                    error: 'Epic not found'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { epicId: epicId || null },
            include: {
                epic: {
                    include: {
                        project: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: {
                id: updatedTask.id,
                epicId: updatedTask.epicId,
                epic: updatedTask.epic ? {
                    id: updatedTask.epic.id,
                    title: updatedTask.epic.title,
                    project: {
                        id: updatedTask.epic.project.id,
                        title: updatedTask.epic.project.title
                    }
                } : null
            }
        });
    } catch (error) {
        console.error('Update task epic error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// タスク完了
router.post('/:id/complete', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;

        const task = await prisma.task.findUnique({
            where: { id },
            include: { taskAssignments: true }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // 担当者チェック
        const isAssigned = task.taskAssignments.some(ta => ta.userId === userId);
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to complete this task'
            });
        }

        // タスクを完了に更新
        await prisma.task.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });

        // ポイントとXPを付与
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const pointsEarned = task.basePoints;
        const xpEarned = task.bonusXp;
        const newXp = user.currentXp + xpEarned;

        // レベルアップ判定
        const getRequiredXp = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
        let newLevel = user.level;
        let currentXp = newXp;

        while (currentXp >= getRequiredXp(newLevel)) {
            currentXp -= getRequiredXp(newLevel);
            newLevel++;
        }

        const levelUp = newLevel > user.level;

        // ユーザー更新
        await prisma.user.update({
            where: { id: userId },
            data: {
                availablePoints: user.availablePoints + pointsEarned,
                totalPoints: user.totalPoints + pointsEarned,
                currentXp: currentXp,
                level: newLevel
            }
        });

        // ポイント履歴に記録
        await prisma.pointsHistory.create({
            data: {
                userId,
                amount: pointsEarned,
                reason: 'task_completion',
                relatedTaskId: id
            }
        });

        // バッジ条件をチェックして自動付与
        const { checkAndAwardBadges } = await import('../utils/badgeChecker.js');
        const awardedBadges = await checkAndAwardBadges(userId);

        res.json({
            success: true,
            data: {
                task_id: id,
                points_earned: pointsEarned,
                xp_earned: xpEarned,
                new_level: newLevel,
                level_up: levelUp,
                badges_earned: awardedBadges
            }
        });
    } catch (error) {
        console.error('Complete task error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// タスク更新（全般）
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, priority, difficulty, base_points, bonus_xp, deadline, scheduled_day } = req.body;

        const task = await prisma.task.findUnique({
            where: { id }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // scheduled_day のバリデーション
        const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', null, ''];
        if (scheduled_day !== undefined && !validDays.includes(scheduled_day)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid scheduled_day'
            });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(priority !== undefined && { priority }),
                ...(difficulty !== undefined && { difficulty: Number(difficulty) }),
                ...(base_points !== undefined && { basePoints: Number(base_points) }),
                ...(bonus_xp !== undefined && { bonusXp: Number(bonus_xp) }),
                ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
                ...(scheduled_day !== undefined && { scheduledDay: scheduled_day || null })
            },
            include: {
                creator: { select: { id: true, displayName: true } },
                taskAssignments: {
                    include: { user: { select: { id: true, displayName: true } } }
                }
            }
        });

        res.json({
            success: true,
            data: {
                id: updatedTask.id,
                title: updatedTask.title,
                description: updatedTask.description,
                priority: updatedTask.priority,
                difficulty: updatedTask.difficulty,
                base_points: updatedTask.basePoints,
                bonus_xp: updatedTask.bonusXp,
                deadline: updatedTask.deadline,
                status: updatedTask.status,
                scheduled_day: (updatedTask as any).scheduledDay
            }
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// タスクステータス更新
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;
        const { status } = req.body;

        // 有効なステータスかチェック
        const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be PENDING, IN_PROGRESS, or COMPLETED'
            });
        }

        const task = await prisma.task.findUnique({
            where: { id },
            include: { taskAssignments: true }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // 担当者チェック
        const isAssigned = task.taskAssignments.some(ta => ta.userId === userId);
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this task'
            });
        }

        // ステータスを更新
        const updateData: any = { status };
        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        }

        await prisma.task.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            data: { task_id: id, status }
        });
    } catch (error) {
        console.error('Update task status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// タスクリセット（完了→未着手に戻す、ポイントも取り消し）
router.post('/:id/reset', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;

        const task = await prisma.task.findUnique({
            where: { id },
            include: { taskAssignments: true }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // 担当者チェック
        const isAssigned = task.taskAssignments.some(ta => ta.userId === userId);
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to reset this task'
            });
        }

        // 完了済みタスクのみリセット可能
        if (task.status !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                error: 'Only completed tasks can be reset'
            });
        }

        // ポイント履歴を取得して取り消す
        const pointsHistory = await prisma.pointsHistory.findFirst({
            where: {
                userId,
                relatedTaskId: id,
                reason: 'task_completion'
            }
        });

        if (pointsHistory) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) {
                // ポイントを差し引く
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        availablePoints: Math.max(0, user.availablePoints - pointsHistory.amount),
                        totalPoints: Math.max(0, user.totalPoints - pointsHistory.amount)
                    }
                });

                // ポイント履歴に取り消し記録を追加
                await prisma.pointsHistory.create({
                    data: {
                        userId,
                        amount: -pointsHistory.amount,
                        reason: 'task_reset',
                        relatedTaskId: id
                    }
                });
            }
        }

        // タスクをPENDINGに戻す
        await prisma.task.update({
            where: { id },
            data: {
                status: 'PENDING',
                completedAt: null
            }
        });

        res.json({
            success: true,
            data: {
                task_id: id,
                message: 'Task has been reset to PENDING',
                points_revoked: pointsHistory?.amount || 0
            }
        });
    } catch (error) {
        console.error('Reset task error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;


