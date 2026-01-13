import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 全バッジ一覧
router.get('/', async (req: Request, res: Response) => {
    try {
        const badges = await prisma.badge.findMany({
            orderBy: { rewardPoints: 'asc' }
        });

        res.json({
            success: true,
            data: badges.map(b => ({
                id: b.id,
                name: b.name,
                description: b.description,
                icon_url: b.iconUrl,
                condition_type: b.conditionType,
                condition_value: b.conditionValue,
                reward_points: b.rewardPoints
            }))
        });
    } catch (error) {
        console.error('Get badges error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 自分のバッジ
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const userBadges = await prisma.userBadge.findMany({
            where: { userId },
            include: { badge: true },
            orderBy: { earnedAt: 'desc' }
        });

        res.json({
            success: true,
            data: userBadges.map(ub => ({
                id: ub.badge.id,
                name: ub.badge.name,
                description: ub.badge.description,
                icon_url: ub.badge.iconUrl,
                earned_at: ub.earnedAt
            }))
        });
    } catch (error) {
        console.error('Get my badges error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// バッジ作成（管理者のみ）
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const { name, description, icon_url, condition_type, condition_value, reward_points } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        const badge = await prisma.badge.create({
            data: {
                name,
                description: description || null,
                iconUrl: icon_url || '🏆',
                conditionType: condition_type || null,
                conditionValue: condition_value ? Number(condition_value) : null,
                rewardPoints: reward_points ? Number(reward_points) : 0
            }
        });

        res.status(201).json({
            success: true,
            data: {
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon_url: badge.iconUrl,
                condition_type: badge.conditionType,
                condition_value: badge.conditionValue,
                reward_points: badge.rewardPoints
            }
        });
    } catch (error) {
        console.error('Create badge error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// バッジ更新（管理者のみ）
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const existing = await prisma.badge.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Badge not found' });
        }

        const { name, description, icon_url, condition_type, condition_value, reward_points } = req.body;

        const badge = await prisma.badge.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(icon_url !== undefined && { iconUrl: icon_url }),
                ...(condition_type !== undefined && { conditionType: condition_type }),
                ...(condition_value !== undefined && { conditionValue: condition_value ? Number(condition_value) : null }),
                ...(reward_points !== undefined && { rewardPoints: Number(reward_points) })
            }
        });

        res.json({
            success: true,
            data: {
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon_url: badge.iconUrl,
                condition_type: badge.conditionType,
                condition_value: badge.conditionValue,
                reward_points: badge.rewardPoints
            }
        });
    } catch (error) {
        console.error('Update badge error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// バッジ削除（管理者のみ）
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const existing = await prisma.badge.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Badge not found' });
        }

        await prisma.badge.delete({ where: { id } });

        res.json({ success: true, message: 'Badge deleted' });
    } catch (error) {
        console.error('Delete badge error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;

