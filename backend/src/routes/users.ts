import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 自分の情報取得
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userBadges: {
                    include: { badge: true }
                },
                loginStreakRecord: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                employee_id: user.employeeId,
                email: user.email,
                display_name: user.displayName,
                avatar_url: user.avatarUrl,
                department: user.department,
                role: user.role,
                level: user.level,
                current_xp: user.currentXp,
                total_points: user.totalPoints,
                available_points: user.availablePoints,
                login_streak: user.loginStreakRecord?.currentStreak || 0,
                badges: user.userBadges.map(ub => ub.badge)
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// プロフィール更新
router.put('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { display_name, avatar_url, department } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                displayName: display_name,
                avatarUrl: avatar_url,
                department
            }
        });

        res.json({
            success: true,
            data: {
                id: user.id,
                display_name: user.displayName,
                avatar_url: user.avatarUrl,
                department: user.department
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ユーザー一覧（管理者用）
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                employeeId: true,
                email: true,
                displayName: true,
                department: true,
                role: true,
                level: true,
                availablePoints: true
            }
        });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ユーザー情報更新（マネージャー以上）
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const userRole = (req as any).userRole;
        const { id } = req.params;
        const { display_name, department, role, email } = req.body;

        // マネージャー以上のみ実行可能
        if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Permission denied'
            });
        }

        // 対象ユーザーを取得
        const targetUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // マネージャーは自分より上位の権限に変更できない
        if (userRole === 'MANAGER' && role === 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Cannot assign ADMIN role'
            });
        }

        // マネージャーはADMINユーザーを編集できない
        if (userRole === 'MANAGER' && targetUser.role === 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Cannot edit ADMIN user'
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(display_name && { displayName: display_name }),
                ...(department && { department }),
                ...(role && { role }),
                ...(email && { email })
            }
        });

        res.json({
            success: true,
            data: {
                id: updatedUser.id,
                employee_id: updatedUser.employeeId,
                display_name: updatedUser.displayName,
                department: updatedUser.department,
                role: updatedUser.role,
                email: updatedUser.email
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
