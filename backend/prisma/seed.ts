import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // バッジマスタデータ
    const badgeData = [
        { name: 'スピードマスター', description: 'タスク10個を期限前に完了', iconUrl: '🏃', conditionType: 'early_completion', conditionValue: 10, rewardPoints: 200 },
        { name: '連続達成王', description: '7日連続でタスク完了', iconUrl: '🔥', conditionType: 'streak', conditionValue: 7, rewardPoints: 300 },
        { name: '品質マスター', description: '高評価タスク5個達成', iconUrl: '🌟', conditionType: 'quality', conditionValue: 5, rewardPoints: 500 },
        { name: 'チームプレイヤー', description: 'チームタスク20個完了', iconUrl: '👥', conditionType: 'team_task', conditionValue: 20, rewardPoints: 400 },
        { name: '100タスク達成', description: '累計100タスク完了', iconUrl: '🎯', conditionType: 'task_count', conditionValue: 100, rewardPoints: 1000 },
    ];

    for (const badge of badgeData) {
        await prisma.badge.upsert({
            where: { id: badge.name }, // Will fail, so we use create
            update: {},
            create: badge,
        }).catch(() => prisma.badge.create({ data: badge }));
    }
    console.log(`✅ Created ${badgeData.length} badges`);

    // 報酬カタログ
    const rewardData = [
        { name: 'Amazonギフト500円', description: 'Amazonギフトカード500円分', category: 'monetary', pointsRequired: 5000, imageUrl: '🎁' },
        { name: 'Amazonギフト1,000円', description: 'Amazonギフトカード1,000円分', category: 'monetary', pointsRequired: 10000, imageUrl: '🎁' },
        { name: 'スターバックス500円', description: 'スターバックスギフトカード', category: 'monetary', pointsRequired: 5000, imageUrl: '☕' },
        { name: 'Uber Eats 1,000円', description: 'Uber Eatsクーポン', category: 'monetary', pointsRequired: 10000, imageUrl: '🍔' },
        { name: '有給休暇半日', description: '有給休暇半日取得権', category: 'experience', pointsRequired: 15000, stock: 5, imageUrl: '🌟' },
        { name: '有給休暇1日', description: '有給休暇1日取得権', category: 'experience', pointsRequired: 30000, stock: 5, imageUrl: '🌟' },
        { name: 'CEOランチ', description: 'CEOとのランチ権', category: 'experience', pointsRequired: 50000, stock: 1, imageUrl: '👔' },
        { name: 'ワイヤレスイヤホン', description: '高品質ワイヤレスイヤホン', category: 'merchandise', pointsRequired: 50000, stock: 3, imageUrl: '🎧' },
        { name: 'Udemy講座', description: 'オンライン講座受講権', category: 'development', pointsRequired: 20000, imageUrl: '📚' },
        { name: '書籍購入補助', description: '好きな本を購入', category: 'development', pointsRequired: 10000, imageUrl: '📖' },
    ];


    for (const reward of rewardData) {
        await prisma.reward.create({ data: reward }).catch(() => { });
    }
    console.log(`✅ Created ${rewardData.length} rewards`);

    // 部署マスタデータ
    const departmentData = [
        { name: '経営企画部', description: '経営戦略の立案と推進' },
        { name: '営業部', description: '顧客対応と売上管理' },
        { name: 'マーケティング部', description: 'ブランド戦略とプロモーション' },
        { name: '開発部', description: 'ソフトウェア開発とシステム構築' },
        { name: '人事部', description: '採用と人材育成' },
        { name: '総務部', description: '社内管理と福利厚生' },
        { name: '経理部', description: '財務管理と経理業務' },
        { name: 'カスタマーサポート部', description: 'お客様対応とサポート' },
    ];

    for (const dept of departmentData) {
        await prisma.department.upsert({
            where: { name: dept.name },
            update: {},
            create: dept,
        });
    }
    console.log(`✅ Created ${departmentData.length} departments`);

    // デモユーザー作成
    const passwordHash = await bcrypt.hash('password123', 12);

    const admin = await prisma.user.upsert({
        where: { employeeId: 'ADMIN001' },
        update: {},
        create: {
            employeeId: 'ADMIN001',
            email: 'admin@taskquest.demo',
            passwordHash,
            displayName: '管理者 太郎',
            department: '経営企画部',
            role: 'ADMIN',
            level: 20,
            currentXp: 5000,
            totalPoints: 50000,
            availablePoints: 35000,
        },
    });
    console.log(`✅ Created admin user: ${admin.displayName}`);

    const manager = await prisma.user.upsert({
        where: { employeeId: 'MGR001' },
        update: {},
        create: {
            employeeId: 'MGR001',
            email: 'manager@taskquest.demo',
            passwordHash,
            displayName: '鈴木 花子',
            department: '営業部',
            role: 'MANAGER',
            level: 15,
            currentXp: 3000,
            totalPoints: 30000,
            availablePoints: 20000,
        },
    });
    console.log(`✅ Created manager user: ${manager.displayName}`);

    const user = await prisma.user.upsert({
        where: { employeeId: 'EMP001' },
        update: {},
        create: {
            employeeId: 'EMP001',
            email: 'user@taskquest.demo',
            passwordHash,
            displayName: '田中 一郎',
            department: '営業部',
            role: 'USER',
            level: 8,
            currentXp: 1500,
            totalPoints: 12000,
            availablePoints: 8500,
        },
    });
    console.log(`✅ Created user: ${user.displayName}`);

    // ログインストリーク初期化
    for (const data of [
        { userId: admin.id, currentStreak: 5, longestStreak: 30 },
        { userId: manager.id, currentStreak: 12, longestStreak: 25 },
        { userId: user.id, currentStreak: 3, longestStreak: 10 },
    ]) {
        await prisma.loginStreak.upsert({
            where: { userId: data.userId },
            update: {},
            create: data,
        });
    }

    // サンプルタスク
    await prisma.task.create({
        data: {
            title: '月次営業報告書作成',
            description: '1月度の営業実績をまとめた報告書を作成する',
            createdBy: manager.id,
            priority: 'HIGH',
            difficulty: 4,
            basePoints: 300,
            bonusXp: 100,
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            tags: JSON.stringify(['営業', '報告書']),
            taskAssignments: {
                create: { userId: user.id }
            }
        },
    }).catch(() => { });

    await prisma.task.create({
        data: {
            title: 'クライアントへの電話フォローアップ',
            description: '先週商談した3社へフォローアップ電話を行う',
            createdBy: manager.id,
            priority: 'MEDIUM',
            difficulty: 2,
            basePoints: 150,
            bonusXp: 50,
            deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            tags: JSON.stringify(['営業', '電話']),
            taskAssignments: {
                create: { userId: user.id }
            }
        },
    }).catch(() => { });

    await prisma.task.create({
        data: {
            title: 'メール返信対応',
            description: '未読メールへの返信を完了する',
            createdBy: manager.id,
            priority: 'LOW',
            difficulty: 1,
            basePoints: 50,
            bonusXp: 20,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            tags: JSON.stringify(['メール']),
            taskAssignments: {
                create: { userId: user.id }
            }
        },
    }).catch(() => { });

    console.log(`✅ Created 3 sample tasks`);

    console.log('🎉 Seeding completed!');
    console.log('\n📋 Demo accounts:');
    console.log('  Admin:   ADMIN001 / password123');
    console.log('  Manager: MGR001   / password123');
    console.log('  User:    EMP001   / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
