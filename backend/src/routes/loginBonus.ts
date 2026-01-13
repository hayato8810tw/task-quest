import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ログインボーナス受取
router.post('/claim', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let loginStreak = await prisma.loginStreak.findUnique({
            where: { userId }
        });

        if (!loginStreak) {
            loginStreak = await prisma.loginStreak.create({
                data: { userId, currentStreak: 0, longestStreak: 0 }
            });
        }

        // 今日既に受け取り済みかチェック
        if (loginStreak.lastLoginDate) {
            const lastLogin = new Date(loginStreak.lastLoginDate);
            lastLogin.setHours(0, 0, 0, 0);

            if (lastLogin.getTime() === today.getTime()) {
                return res.status(400).json({
                    success: false,
                    error: 'Login bonus already claimed today'
                });
            }

            // 連続日数チェック
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastLogin.getTime() === yesterday.getTime()) {
                loginStreak.currentStreak += 1;
            } else {
                loginStreak.currentStreak = 1;
            }
        } else {
            loginStreak.currentStreak = 1;
        }

        // 最長記録更新
        if (loginStreak.currentStreak > loginStreak.longestStreak) {
            loginStreak.longestStreak = loginStreak.currentStreak;
        }

        // ボーナス計算
        let bonusPoints = 50;
        let bonusXp = 10;

        if (loginStreak.currentStreak === 3) {
            bonusPoints += 50;
        } else if (loginStreak.currentStreak === 7) {
            bonusPoints += 150;
            bonusXp += 40;
        } else if (loginStreak.currentStreak === 30) {
            bonusPoints += 1000;
            bonusXp += 190;
        }

        // データ更新
        await prisma.$transaction([
            prisma.loginStreak.update({
                where: { userId },
                data: {
                    currentStreak: loginStreak.currentStreak,
                    longestStreak: loginStreak.longestStreak,
                    lastLoginDate: today
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    availablePoints: { increment: bonusPoints },
                    totalPoints: { increment: bonusPoints },
                    currentXp: { increment: bonusXp },
                    lastLoginDate: today
                }
            }),
            prisma.pointsHistory.create({
                data: {
                    userId,
                    amount: bonusPoints,
                    reason: 'login_bonus'
                }
            })
        ]);

        res.json({
            success: true,
            data: {
                points_earned: bonusPoints,
                xp_earned: bonusXp,
                current_streak: loginStreak.currentStreak,
                longest_streak: loginStreak.longestStreak
            }
        });
    } catch (error) {
        console.error('Claim login bonus error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ストリーク状況
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const loginStreak = await prisma.loginStreak.findUnique({
            where: { userId }
        });

        // 今日既に受け取り済みかチェック
        let claimedToday = false;
        if (loginStreak?.lastLoginDate) {
            const lastLogin = new Date(loginStreak.lastLoginDate);
            lastLogin.setHours(0, 0, 0, 0);
            claimedToday = lastLogin.getTime() === today.getTime();
        }

        res.json({
            success: true,
            data: {
                current_streak: loginStreak?.currentStreak || 0,
                longest_streak: loginStreak?.longestStreak || 0,
                last_login_date: loginStreak?.lastLoginDate,
                claimed_today: claimedToday
            }
        });
    } catch (error) {
        console.error('Get login status error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
