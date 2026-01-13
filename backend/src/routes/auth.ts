import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ログイン
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { employee_id, password } = req.body;

        if (!employee_id || !password) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID and password are required'
            });
        }

        const user = await prisma.user.findUnique({
            where: { employeeId: employee_id }
        });

        if (!user || !user.passwordHash) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    display_name: user.displayName,
                    level: user.level,
                    available_points: user.availablePoints,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ログアウト
router.post('/logout', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// 新規登録（管理者用）
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { employee_id, email, password, display_name, department, role } = req.body;

        if (!employee_id || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID, email, and password are required'
            });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { employeeId: employee_id },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                employeeId: employee_id,
                email,
                passwordHash,
                displayName: display_name,
                department,
                role: role || 'USER'
            }
        });

        // ログインストリーク記録を作成
        await prisma.loginStreak.create({
            data: { userId: user.id }
        });

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                employee_id: user.employeeId,
                email: user.email,
                display_name: user.displayName
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
