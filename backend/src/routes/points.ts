import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ポイント履歴
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { limit = 20, offset = 0 } = req.query;

        const history = await prisma.pointsHistory.findMany({
            where: { userId },
            include: { task: { select: { title: true } } },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });

        res.json({
            success: true,
            data: history.map(h => ({
                id: h.id,
                amount: h.amount,
                reason: h.reason,
                task_title: h.task?.title,
                created_at: h.createdAt
            }))
        });
    } catch (error) {
        console.error('Get points history error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 現在の残高
router.get('/balance', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { availablePoints: true, totalPoints: true }
        });

        res.json({
            success: true,
            data: {
                available_points: user?.availablePoints || 0,
                total_points: user?.totalPoints || 0
            }
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
