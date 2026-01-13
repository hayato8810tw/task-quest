import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// リクエストログ
router.use((req, res, next) => {
    console.log('AI route accessed:', req.method, req.path);
    next();
});

// AI推奨値計算
router.post('/suggest-points', authMiddleware, async (req: Request, res: Response) => {
    console.log('AI suggest-points API called');
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('API Key exists:', !!apiKey, 'Length:', apiKey?.length || 0);

        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set');
            return res.status(500).json({ success: false, error: 'Gemini API キーが設定されていません' });
        }

        const { title, description, priority, difficulty, deadline } = req.body;
        console.log('Request body:', { title, description, priority, difficulty, deadline });

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        // 期限までの日数を計算
        let daysUntilDeadline = null;
        if (deadline) {
            daysUntilDeadline = Math.ceil(
                (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
        }

        const prompt = `あなたはゲーミフィケーションタスク管理システムのポイント算定AIです。
以下のタスク情報を分析し、適切な基礎ポイントとボーナスXPを提案してください。

【タスク情報】
- タイトル: ${title}
- 説明: ${description || '（説明なし）'}
- 優先度: ${priority || 'MEDIUM'}（LOW/MEDIUM/HIGH/URGENT）
- 難易度: ${difficulty || 3}（1-5、5が最も難しい）
- 期限まで: ${daysUntilDeadline !== null ? `${daysUntilDeadline}日` : '設定なし'}

【ポイント算定基準】
- 基礎ポイント: 30〜300の範囲
  - 簡単な作業: 30-60
  - 標準的な作業: 60-120
  - 複雑な作業: 120-200
  - 非常に困難な作業: 200-300
- ボーナスXP: 基礎ポイントの40-60%程度

【考慮すべき要素】
1. タスクの複雑さ（説明から推測）
2. 推定作業時間
3. 必要なスキルレベル
4. 期限の緊急性
5. 優先度

【出力形式】
以下のJSON形式のみで回答してください。他のテキストは含めないでください。
{"base_points": 数値, "bonus_xp": 数値, "reasoning": "簡潔な理由（30文字以内）"}`;

        console.log('Calling Gemini API...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log('Gemini response:', responseText);

        // JSONを抽出
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid AI response format');
        }

        const suggestion = JSON.parse(jsonMatch[0]);

        res.json({
            success: true,
            data: {
                base_points: suggestion.base_points,
                bonus_xp: suggestion.bonus_xp,
                reasoning: suggestion.reasoning
            }
        });
    } catch (error: any) {
        console.error('AI suggest points error:', error?.message || error);
        res.status(500).json({
            success: false,
            error: 'AI推奨値の取得に失敗しました。手動で設定してください。'
        });
    }
});

export default router;
