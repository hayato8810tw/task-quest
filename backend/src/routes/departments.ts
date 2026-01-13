import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 部署一覧取得
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });

        res.json({
            success: true,
            data: departments.map(d => ({
                id: d.id,
                name: d.name,
                description: d.description,
                created_at: d.createdAt
            }))
        });
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 部署作成（管理者のみ）
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        // 重複チェック
        const existing = await prisma.department.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Department already exists' });
        }

        const department = await prisma.department.create({
            data: { name, description: description || null }
        });

        res.status(201).json({
            success: true,
            data: {
                id: department.id,
                name: department.name,
                description: department.description
            }
        });
    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 部署更新（管理者のみ）
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const { name, description } = req.body;

        // 存在確認
        const existing = await prisma.department.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Department not found' });
        }

        // 名前の重複チェック（自分以外）
        if (name && name !== existing.name) {
            const duplicate = await prisma.department.findUnique({ where: { name } });
            if (duplicate) {
                return res.status(400).json({ success: false, error: 'Department name already exists' });
            }
        }

        const department = await prisma.department.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description: description || null })
            }
        });

        res.json({
            success: true,
            data: {
                id: department.id,
                name: department.name,
                description: department.description
            }
        });
    } catch (error) {
        console.error('Update department error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 部署削除（管理者のみ）
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        const { id } = req.params;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        // 存在確認
        const existing = await prisma.department.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Department not found' });
        }

        await prisma.department.delete({ where: { id } });

        res.json({
            success: true,
            message: 'Department deleted'
        });
    } catch (error) {
        console.error('Delete department error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
