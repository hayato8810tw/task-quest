import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import pointsRoutes from './routes/points.js';
import rewardsRoutes from './routes/rewards.js';
import badgesRoutes from './routes/badges.js';
import leaderboardRoutes from './routes/leaderboard.js';
import loginBonusRoutes from './routes/loginBonus.js';
import teamRoutes from './routes/team.js';
import projectsRoutes from './routes/projects.js';
import epicsRoutes from './routes/epics.js';
import departmentsRoutes from './routes/departments.js';
import archivesRoutes from './routes/archives.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: true,  // 全オリジンを許可（開発/デモ用）
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/login-bonus', loginBonusRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/epics', epicsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/archives', archivesRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Not found'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 TaskQuest API server running on port ${PORT}`);
});

export default app;
