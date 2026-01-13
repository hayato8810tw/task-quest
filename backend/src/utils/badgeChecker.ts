import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BadgeCheckResult {
    badgeId: string;
    badgeName: string;
    badgeIcon: string;
    rewardPoints: number;
}

/**
 * ユーザーがバッジ条件を満たしているかチェックし、未取得バッジを付与
 */
export async function checkAndAwardBadges(userId: string): Promise<BadgeCheckResult[]> {
    const awardedBadges: BadgeCheckResult[] = [];

    try {
        // 全バッジ取得
        const allBadges = await prisma.badge.findMany();

        // ユーザーが既に持っているバッジ
        const userBadges = await prisma.userBadge.findMany({
            where: { userId },
            select: { badgeId: true }
        });
        const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

        // ユーザー統計を取得
        const stats = await getUserStats(userId);

        for (const badge of allBadges) {
            // 既に持っているバッジはスキップ
            if (earnedBadgeIds.has(badge.id)) continue;

            // 条件が設定されていない場合はスキップ（手動付与）
            if (!badge.conditionType || badge.conditionValue === null) continue;

            const conditionMet = checkCondition(badge.conditionType, badge.conditionValue, stats);

            if (conditionMet) {
                // バッジを付与
                await prisma.userBadge.create({
                    data: {
                        userId,
                        badgeId: badge.id
                    }
                });

                // ボーナスポイントを付与
                if (badge.rewardPoints > 0) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            availablePoints: { increment: badge.rewardPoints },
                            totalPoints: { increment: badge.rewardPoints }
                        }
                    });
                }

                awardedBadges.push({
                    badgeId: badge.id,
                    badgeName: badge.name,
                    badgeIcon: badge.iconUrl || '🏆',
                    rewardPoints: badge.rewardPoints
                });
            }
        }
    } catch (error) {
        console.error('Check badges error:', error);
    }

    return awardedBadges;
}

interface UserStats {
    taskCount: number;           // 完了タスク数
    streakDays: number;          // 連続ログイン日数
    earlyCompletionCount: number; // 期限前完了数
    qualityTaskCount: number;    // 高評価タスク数
    teamTaskCount: number;       // チームタスク数
    totalPoints: number;         // 累計ポイント
    level: number;               // レベル
}

async function getUserStats(userId: string): Promise<UserStats> {
    // 完了タスク数をカウント
    const taskCount = await prisma.task.count({
        where: {
            taskAssignments: { some: { userId } },
            status: 'COMPLETED'
        }
    });

    // 期限前に完了したタスク数
    const earlyCompletionCount = await prisma.task.count({
        where: {
            taskAssignments: { some: { userId } },
            status: 'COMPLETED',
            deadline: { not: null },
            completedAt: { not: null }
        }
    });

    // チームタスク（複数人アサイン）
    const teamTasks = await prisma.task.findMany({
        where: {
            taskAssignments: { some: { userId } },
            status: 'COMPLETED'
        },
        include: {
            taskAssignments: true
        }
    });
    const teamTaskCount = teamTasks.filter(t => t.taskAssignments.length > 1).length;

    // ユーザー情報
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true, level: true }
    });

    // 連続ログイン日数
    const loginStreak = await prisma.loginStreak.findUnique({
        where: { userId }
    });

    return {
        taskCount,
        streakDays: loginStreak?.currentStreak || 0,
        earlyCompletionCount,
        qualityTaskCount: 0, // 将来実装
        teamTaskCount,
        totalPoints: user?.totalPoints || 0,
        level: user?.level || 1
    };
}

function checkCondition(conditionType: string, conditionValue: number, stats: UserStats): boolean {
    switch (conditionType) {
        case 'task_count':
            return stats.taskCount >= conditionValue;
        case 'streak':
            return stats.streakDays >= conditionValue;
        case 'early_completion':
            return stats.earlyCompletionCount >= conditionValue;
        case 'quality':
            return stats.qualityTaskCount >= conditionValue;
        case 'team_task':
            return stats.teamTaskCount >= conditionValue;
        case 'level':
            return stats.level >= conditionValue;
        case 'total_points':
            return stats.totalPoints >= conditionValue;
        default:
            return false;
    }
}
