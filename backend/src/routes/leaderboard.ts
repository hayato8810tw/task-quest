import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ランキング取得（期間別対応）
router.get('/', async (req: Request, res: Response) => {
    try {
        const { period = 'total', department, limit = 20 } = req.query;

        // 期間の開始日を計算
        const now = new Date();
        let startDate: Date | null = null;

        switch (period) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                const dayOfWeek = now.getDay();
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'total':
            default:
                startDate = null;
                break;
        }

        if (startDate) {
            // 期間別: PointsHistoryから集計
            const pointsAggregation = await prisma.pointsHistory.groupBy({
                by: ['userId'],
                where: {
                    createdAt: { gte: startDate },
                },
                _sum: {
                    amount: true
                }
            });

            // ユーザー情報を取得
            const userIds = pointsAggregation.map(p => p.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    displayName: true,
                    department: true,
                    level: true,
                    avatarUrl: true
                }
            });

            // ユーザー情報とポイントをマージ
            const leaderboard = pointsAggregation.map(p => {
                const user = users.find(u => u.id === p.userId);
                return {
                    id: p.userId,
                    display_name: user?.displayName || 'Unknown',
                    department: user?.department || '',
                    level: user?.level || 1,
                    avatar_url: user?.avatarUrl || null,
                    period_points: p._sum?.amount || 0
                };
            });

            // ポイントでソート
            leaderboard.sort((a, b) => b.period_points - a.period_points);

            // ランクを追加
            const rankedLeaderboard = leaderboard.slice(0, Number(limit)).map((entry, index) => ({
                rank: index + 1,
                ...entry
            }));

            res.json({
                success: true,
                period,
                data: rankedLeaderboard
            });
        } else {
            // 累計: ユーザーのtotalPointsを使用
            const users = await prisma.user.findMany({
                where: department ? { department: String(department) } : undefined,
                select: {
                    id: true,
                    displayName: true,
                    department: true,
                    level: true,
                    totalPoints: true,
                    availablePoints: true,
                    avatarUrl: true
                },
                orderBy: { totalPoints: 'desc' },
                take: Number(limit)
            });

            res.json({
                success: true,
                period: 'total',
                data: users.map((user, index) => ({
                    rank: index + 1,
                    id: user.id,
                    display_name: user.displayName,
                    department: user.department,
                    level: user.level,
                    period_points: user.totalPoints,
                    avatar_url: user.avatarUrl
                }))
            });
        }
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
