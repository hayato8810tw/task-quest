import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 報酬カタログ取得
router.get('/', async (req: Request, res: Response) => {
    try {
        const { category } = req.query;

        const where: any = { isActive: true };
        if (category) where.category = category;

        const rewards = await prisma.reward.findMany({
            where,
            orderBy: { pointsRequired: 'asc' }
        });

        res.json({
            success: true,
            data: rewards.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                category: r.category,
                points_required: r.pointsRequired,
                stock: r.stock,
                image_url: r.imageUrl
            }))
        });
    } catch (error) {
        console.error('Get rewards error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 報酬交換
router.post('/redeem', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { reward_id } = req.body;

        const reward = await prisma.reward.findUnique({ where: { id: reward_id } });
        if (!reward || !reward.isActive) {
            return res.status(404).json({ success: false, error: 'Reward not found' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.availablePoints < reward.pointsRequired) {
            return res.status(400).json({ success: false, error: 'Insufficient points' });
        }

        if (reward.stock !== null && reward.stock <= 0) {
            return res.status(400).json({ success: false, error: 'Out of stock' });
        }

        // 交換処理
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { availablePoints: user.availablePoints - reward.pointsRequired }
            }),
            prisma.rewardsRedemption.create({
                data: {
                    userId,
                    rewardId: reward_id,
                    pointsSpent: reward.pointsRequired
                }
            }),
            prisma.pointsHistory.create({
                data: {
                    userId,
                    amount: -reward.pointsRequired,
                    reason: 'reward_redemption',
                    relatedRewardId: reward_id
                }
            }),
            ...(reward.stock !== null ? [
                prisma.reward.update({
                    where: { id: reward_id },
                    data: { stock: reward.stock - 1 }
                })
            ] : [])
        ]);

        res.json({
            success: true,
            data: {
                message: 'Reward redeemed successfully',
                reward_name: reward.name,
                points_spent: reward.pointsRequired
            }
        });
    } catch (error) {
        console.error('Redeem reward error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 交換履歴
router.get('/redemptions', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const redemptions = await prisma.rewardsRedemption.findMany({
            where: { userId },
            include: { reward: true },
            orderBy: { redeemedAt: 'desc' }
        });

        res.json({
            success: true,
            data: redemptions.map(r => ({
                id: r.id,
                reward_name: r.reward.name,
                points_spent: r.pointsSpent,
                status: r.status,
                redeemed_at: r.redeemedAt
            }))
        });
    } catch (error) {
        console.error('Get redemptions error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 全報酬取得（管理者用 - 非アクティブも含む）
router.get('/admin/all', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const rewards = await prisma.reward.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: rewards.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                category: r.category,
                points_required: r.pointsRequired,
                stock: r.stock,
                image_url: r.imageUrl,
                is_active: r.isActive,
                created_at: r.createdAt
            }))
        });
    } catch (error) {
        console.error('Get all rewards error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 報酬作成（管理者のみ）
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const { name, description, category, points_required, stock, image_url } = req.body;

        if (!name || !points_required) {
            return res.status(400).json({ success: false, error: 'Name and points_required are required' });
        }

        const reward = await prisma.reward.create({
            data: {
                name,
                description: description || '',
                category: category || 'other',
                pointsRequired: parseInt(points_required),
                stock: stock !== undefined ? parseInt(stock) : null,
                imageUrl: image_url || '🎁'
            }
        });

        res.status(201).json({
            success: true,
            data: {
                id: reward.id,
                name: reward.name,
                description: reward.description,
                category: reward.category,
                points_required: reward.pointsRequired,
                stock: reward.stock,
                image_url: reward.imageUrl
            }
        });
    } catch (error) {
        console.error('Create reward error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 報酬更新（管理者のみ）
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const { name, description, category, points_required, stock, image_url, is_active } = req.body;

        const reward = await prisma.reward.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
                ...(points_required !== undefined && { pointsRequired: parseInt(points_required) }),
                ...(stock !== undefined && { stock: stock === null ? null : parseInt(stock) }),
                ...(image_url && { imageUrl: image_url }),
                ...(is_active !== undefined && { isActive: is_active })
            }
        });

        res.json({
            success: true,
            data: {
                id: reward.id,
                name: reward.name,
                description: reward.description,
                category: reward.category,
                points_required: reward.pointsRequired,
                stock: reward.stock,
                image_url: reward.imageUrl,
                is_active: reward.isActive
            }
        });
    } catch (error) {
        console.error('Update reward error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 報酬削除（管理者のみ）
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        // 実際には削除せず非アクティブにする
        await prisma.reward.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({
            success: true,
            message: 'Reward deactivated'
        });
    } catch (error) {
        console.error('Delete reward error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 全申請一覧取得（管理者用）
router.get('/admin/redemptions', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const { status } = req.query;
        const where: any = {};
        if (status && status !== 'all') {
            where.status = status;
        }

        const redemptions = await prisma.rewardsRedemption.findMany({
            where,
            include: {
                reward: true,
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        department: true,
                        email: true
                    }
                }
            },
            orderBy: { redeemedAt: 'desc' }
        });

        res.json({
            success: true,
            data: redemptions.map(r => ({
                id: r.id,
                user_id: r.userId,
                user_name: r.user.displayName,
                user_department: r.user.department,
                user_email: r.user.email,
                reward_id: r.rewardId,
                reward_name: r.reward.name,
                reward_image: r.reward.imageUrl,
                points_spent: r.pointsSpent,
                status: r.status,
                redeemed_at: r.redeemedAt,
                delivered_at: r.deliveredAt
            }))
        });
    } catch (error) {
        console.error('Get admin redemptions error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 申請承認（管理者のみ）
router.patch('/redemptions/:id/approve', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const redemption = await prisma.rewardsRedemption.findUnique({
            where: { id },
            include: { reward: true, user: true }
        });

        if (!redemption) {
            return res.status(404).json({ success: false, error: 'Redemption not found' });
        }

        if (redemption.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: 'Redemption is not pending' });
        }

        await prisma.rewardsRedemption.update({
            where: { id },
            data: {
                status: 'APPROVED',
                deliveredAt: new Date()
            }
        });

        res.json({
            success: true,
            data: {
                message: '申請を承認しました',
                user_name: redemption.user.displayName,
                reward_name: redemption.reward.name
            }
        });
    } catch (error) {
        console.error('Approve redemption error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 申請却下（管理者のみ） - ポイント返却
router.patch('/redemptions/:id/reject', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const redemption = await prisma.rewardsRedemption.findUnique({
            where: { id },
            include: { reward: true, user: true }
        });

        if (!redemption) {
            return res.status(404).json({ success: false, error: 'Redemption not found' });
        }

        if (redemption.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: 'Redemption is not pending' });
        }

        // ポイント返却とステータス更新
        await prisma.$transaction([
            prisma.rewardsRedemption.update({
                where: { id },
                data: { status: 'REJECTED' }
            }),
            prisma.user.update({
                where: { id: redemption.userId },
                data: {
                    availablePoints: redemption.user.availablePoints + redemption.pointsSpent
                }
            }),
            prisma.pointsHistory.create({
                data: {
                    userId: redemption.userId,
                    amount: redemption.pointsSpent,
                    reason: 'reward_rejection_refund',
                    relatedRewardId: redemption.rewardId
                }
            }),
            // 在庫を戻す
            ...(redemption.reward.stock !== null ? [
                prisma.reward.update({
                    where: { id: redemption.rewardId },
                    data: { stock: redemption.reward.stock + 1 }
                })
            ] : [])
        ]);

        res.json({
            success: true,
            data: {
                message: '申請を却下しました。ポイントを返却しました。',
                user_name: redemption.user.displayName,
                reward_name: redemption.reward.name,
                points_refunded: redemption.pointsSpent
            }
        });
    } catch (error) {
        console.error('Reject redemption error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
