# TaskQuest 仕様書

**バージョン**: 1.1.0  
**更新日**: 2026年1月13日  
**ドキュメント種別**: システム仕様書

---

## 1. システム概要

### 1.1 アプリケーション名
**TaskQuest** - 企業向けゲーミフィケーションタスク管理システム

### 1.2 目的
従業員のタスク管理にゲーミフィケーション要素を導入し、業務効率とモチベーションを向上させる。

### 1.3 本番環境URL

| サービス | URL |
|----------|-----|
| **フロントエンド** | https://task-quest-six.vercel.app |
| **バックエンドAPI** | https://taskquest-api.onrender.com |

### 1.4 主要機能
- タスク・プロジェクト・エピックの階層管理
- プロジェクト・エピック・タスクの編集機能
- ポイント・XP・レベルシステム
- ログインボーナス・ストリーク機能
- ランキング（デイリー/ウィークリー/マンスリー/年間/累計）
- 報酬交換システム
- バッジ・実績システム
- アーカイブ機能
- AI推奨値計算（Gemini API）

### 1.5 技術スタック

| 項目 | 技術 |
|------|------|
| **フロントエンド** | Next.js 16, React, TypeScript, Tailwind CSS, Shadcn UI |
| **バックエンド** | Express.js, TypeScript, Node.js |
| **データベース** | PostgreSQL (Prisma ORM) |
| **認証** | JWT (JSON Web Token) |
| **AI機能** | Google Gemini API (gemini-2.5-flash) |
| **ホスティング** | Vercel (フロントエンド), Render (バックエンド + DB) |

---

## 2. ユーザー管理

### 2.1 ユーザーロール

| ロール | 権限 |
|--------|------|
| `USER` | タスクの閲覧・実行、報酬交換、プロフィール編集 |
| `MANAGER` | タスク・エピック・プロジェクトの作成・編集、チーム管理 |
| `ADMIN` | 全機能へのアクセス、ユーザー管理、報酬管理 |

### 2.2 ユーザー属性

| フィールド | 型 | 説明 |
|------------|------|------|
| id | UUID | ユーザー一意識別子 |
| employeeId | String | 社員ID（ユニーク） |
| email | String | メールアドレス（ユニーク） |
| displayName | String | 表示名 |
| department | String | 所属部署 |
| role | Enum | USER / MANAGER / ADMIN |
| level | Int | 現在のレベル（デフォルト: 1） |
| currentXp | Int | 現在のXP |
| totalPoints | Int | 累計獲得ポイント |
| availablePoints | Int | 使用可能ポイント |
| loginStreak | Int | 連続ログイン日数 |

### 2.3 レベルシステム

```
レベルアップ必要XP = Floor(100 × レベル^1.5)
例: レベル5→6 に必要なXP ≈ 1,118
```

---

## 3. タスク管理

### 3.1 階層構造

```
プロジェクト（大分類）
  └── エピック（中分類）
       └── タスク（小分類/実行単位）
```

### 3.2 タスク属性

| フィールド | 型 | 説明 |
|------------|------|------|
| id | UUID | タスク一意識別子 |
| title | String | タスクタイトル |
| description | String | 説明文 |
| priority | Enum | URGENT / HIGH / MEDIUM / LOW |
| difficulty | Int | 難易度（1-5） |
| basePoints | Int | 完了時獲得ポイント |
| bonusXp | Int | 完了時獲得XP |
| status | Enum | PENDING / IN_PROGRESS / COMPLETED |
| deadline | DateTime | 期限 |
| epicId | UUID | 所属エピックID（任意） |
| isArchived | Boolean | アーカイブ済みフラグ |

### 3.3 ステータス遷移

```
PENDING（未着手）→ IN_PROGRESS（進行中）→ COMPLETED（完了）
```

### 3.4 編集機能

プロジェクト詳細ページ（/projects/[id]）から以下を編集可能：

| 対象 | 編集可能フィールド |
|------|-------------------|
| **プロジェクト** | title, description |
| **エピック** | title, description |
| **タスク** | title, description, priority, difficulty, basePoints, bonusXp |

### 3.5 タスク作成時の自動選択

プロジェクト詳細ページから「+ タスクを追加」をクリックすると、タスク作成画面でプロジェクトとエピックが自動的に選択される。

### 3.6 AI推奨値計算

タスク作成時にGemini API（gemini-2.5-flash）を使用して、タスク内容に基づいた適切なポイント・XP推奨値を自動計算。

**考慮要素**:
- タスクタイトル・説明
- 優先度
- 難易度
- 期限の有無

---

## 4. ポイント・XPシステム

### 4.1 ポイント獲得

| アクション | ポイント |
|------------|----------|
| タスク完了 | basePoints（タスクごと設定） |
| ログインボーナス | streak × 10 + 20 |
| バッジ獲得 | バッジごとに設定 |

### 4.2 XP獲得

| アクション | XP |
|------------|-----|
| タスク完了 | bonusXp（タスクごと設定） |
| ログインボーナス | streak × 5 + 10 |

### 4.3 ポイント消費
報酬交換時に `availablePoints` から減算。

---

## 5. ログインボーナス

### 5.1 ストリーク計算

```javascript
// 連続ログイン日数に応じたボーナス
points = streak * 10 + 20;  // 例: 5日連続 = 70pt
xp = streak * 5 + 10;       // 例: 5日連続 = 35XP
```

### 5.2 リセット条件
- 24時間以上ログインがない場合、ストリークは1にリセット

---

## 6. ランキング

### 6.1 期間タイプ

| 期間 | 集計範囲 |
|------|----------|
| デイリー | 当日の獲得ポイント |
| ウィークリー | 今週（日曜〜）の獲得ポイント |
| マンスリー | 今月の獲得ポイント |
| 年間 | 今年の獲得ポイント |
| 累計 | 全期間の累計ポイント |

### 6.2 表示情報
- 順位
- ユーザー名
- 部署
- レベル
- 期間内獲得ポイント

---

## 7. 報酬システム

### 7.1 報酬属性

| フィールド | 型 | 説明 |
|------------|------|------|
| name | String | 報酬名 |
| description | String | 説明 |
| category | String | カテゴリ |
| pointsRequired | Int | 必要ポイント |
| stock | Int | 在庫数（null=無制限） |
| isActive | Boolean | 有効フラグ |

### 7.2 交換フロー

1. ユーザーが報酬を選択
2. ポイント残高確認
3. 在庫確認
4. 交換実行（ポイント減算、在庫減算）
5. 交換履歴に記録

---

## 8. バッジシステム

### 8.1 バッジタイプ

| 条件タイプ | 説明 |
|------------|------|
| TASK_COUNT | タスク完了数 |
| LOGIN_STREAK | 連続ログイン日数 |
| TOTAL_POINTS | 累計ポイント |
| LEVEL | レベル達成 |

### 8.2 自動付与
条件達成時に自動的にバッジを付与。

---

## 9. アーカイブ機能

### 9.1 アーカイブ対象
- 完了済みタスク
- 完了済みエピック（全タスク完了）
- 完了済みプロジェクト（全エピック完了）

### 9.2 一括アーカイブ
候補一覧から一括でアーカイブ可能。

### 9.3 アーカイブ解除
アーカイブ済みアイテムはいつでも解除可能。

---

## 10. APIエンドポイント

### 10.1 認証 API

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/auth/login | ログイン |
| POST | /api/auth/register | ユーザー登録 |
| GET | /api/auth/me | 現在のユーザー情報取得 |

### 10.2 タスク API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/tasks | タスク一覧取得 |
| POST | /api/tasks | タスク作成 |
| GET | /api/tasks/:id | タスク詳細取得 |
| PATCH | /api/tasks/:id | タスク更新（全般） |
| PATCH | /api/tasks/:id/status | ステータス変更 |
| PATCH | /api/tasks/:id/epic | エピック変更 |
| POST | /api/tasks/:id/complete | タスク完了 |
| POST | /api/tasks/:id/reset | タスクリセット |

### 10.3 プロジェクト API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/projects | プロジェクト一覧 |
| POST | /api/projects | プロジェクト作成 |
| GET | /api/projects/:id | プロジェクト詳細 |
| PATCH | /api/projects/:id | プロジェクト更新 |

### 10.4 エピック API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/epics | エピック一覧 |
| POST | /api/epics | エピック作成 |
| GET | /api/epics/:id | エピック詳細 |
| PATCH | /api/epics/:id | エピック更新 |

### 10.5 ログインボーナス API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/login-bonus/status | ボーナス受取状況 |
| POST | /api/login-bonus/claim | ボーナス受取 |

### 10.6 ランキング API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/leaderboard?period=xxx | ランキング取得 |

### 10.7 報酬 API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/rewards | 報酬一覧 |
| POST | /api/rewards | 報酬作成 |
| POST | /api/rewards/redeem | 報酬交換 |
| GET | /api/rewards/redemptions | 交換履歴 |

### 10.8 アーカイブ API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/archives/tasks | アーカイブ済みタスク |
| GET | /api/archives/candidates/:type | アーカイブ候補取得 |
| POST | /api/archives/:type/:id | アーカイブ実行 |
| DELETE | /api/archives/:type/:id | アーカイブ解除 |

### 10.9 AI API

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/ai/suggest-points | ポイント/XP推奨値計算 |

---

## 11. フロントエンドページ構成

| パス | ページ名 | 説明 |
|------|----------|------|
| / | ルート | ダッシュボードまたはログインへリダイレクト |
| /login | ログイン | ログインフォーム |
| /register | 登録 | ユーザー登録フォーム |
| /dashboard | ダッシュボード | メインダッシュボード |
| /tasks | タスク一覧 | 全タスク一覧（グリッド表示） |
| /tasks/new | タスク作成 | 新規タスク作成フォーム（自動選択対応） |
| /projects | プロジェクト | プロジェクト一覧・チーム管理 |
| /projects/[id] | プロジェクト詳細 | エピック・タスク階層表示・編集機能 |
| /projects/new | プロジェクト作成 | 新規プロジェクト作成 |
| /epics/new | エピック作成 | 新規エピック作成（自動選択対応） |
| /leaderboard | ランキング | 期間別ランキング表示 |
| /rewards | 報酬 | 報酬カタログ・交換 |
| /rewards/admin | 報酬管理 | 報酬の追加・編集（管理者用） |
| /rewards/requests | 交換申請管理 | 交換申請の承認・却下 |
| /badges | バッジ | 獲得バッジ一覧 |
| /profile | プロフィール | ユーザー情報編集 |
| /archives | アーカイブ | アーカイブ済みアイテム管理 |
| /team | チーム | チームメンバー管理 |

---

## 12. UI/UX デザイン

### 12.1 カラースキーム
- **プライマリ**: パープル・ピンクグラデーション
- **背景**: スレート900〜パープル900のグラデーション
- **アクセント**: ブルー（進行中）、グリーン（完了）

### 12.2 視覚的区別

**タスクステータス**:
- 未着手: 標準表示
- 進行中: 青い左ボーダー・青い背景グラデーション
- 完了済み: 透明度50%・グレー表示

**優先度**:
- 緊急: 赤い左ボーダー
- 高: オレンジの左ボーダー
- 中: 黄色の左ボーダー
- 低: グレーの左ボーダー

**期限**:
- 期限切れ: 赤字 + ⚠️アイコン
- 3日以内: オレンジ表示

### 12.3 ソート順序
タスク一覧はステータス順（進行中→未着手→完了済み）をデフォルト。

### 12.4 編集UI
各項目の横に ✏️ アイコンを配置。クリックでモーダル表示。

---

## 13. データベーススキーマ

### 13.1 テーブル一覧

| テーブル名 | 説明 |
|------------|------|
| users | ユーザー情報 |
| projects | プロジェクト |
| epics | エピック |
| tasks | タスク |
| task_assignments | タスク割り当て |
| points_history | ポイント履歴 |
| badges | バッジマスタ |
| user_badges | ユーザーバッジ獲得 |
| rewards | 報酬マスタ |
| rewards_redemption | 報酬交換履歴 |
| login_streaks | ログインストリーク |
| departments | 部署マスタ |

---

## 14. セキュリティ

### 14.1 認証
- JWT（JSON Web Token）による認証
- トークン有効期限: 7日間

### 14.2 パスワード
- bcrypt によるハッシュ化（salt rounds: 12）

### 14.3 API保護
- authMiddleware による全APIエンドポイント保護
- ロールベースのアクセス制御

### 14.4 CORS
- 本番環境では全オリジン許可（`origin: true`）

---

## 15. 環境変数

### バックエンド（Render）

| 変数名 | 説明 |
|--------|------|
| DATABASE_URL | PostgreSQL接続URL |
| JWT_SECRET | JWT署名用シークレット |
| GEMINI_API_KEY | Google Gemini API キー |
| PORT | サーバーポート（デフォルト: 3001） |

### フロントエンド（Vercel）

| 変数名 | 説明 |
|--------|------|
| NEXT_PUBLIC_API_URL | バックエンドAPIのURL |

---

## 16. デプロイ構成

| サービス | 用途 | プラットフォーム |
|----------|------|-----------------|
| Vercel | フロントエンド | https://task-quest-six.vercel.app |
| Render | バックエンドAPI | https://taskquest-api.onrender.com |
| Render | PostgreSQL DB | 内部接続 |

---

## 17. 起動方法

### 17.1 バックエンド
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```
ポート: 3001

### 17.2 フロントエンド
```bash
cd frontend
npm install
npm run dev
```
ポート: 3000

---

## 18. 将来の拡張候補

- [ ] 通知機能（期限アラート、メンション）
- [ ] チームチャット機能
- [ ] ガントチャート表示
- [ ] モバイルアプリ対応
- [ ] SSO（シングルサインオン）対応
- [ ] 多言語対応
- [ ] ダークモード切り替え
- [ ] Slack/Teams連携

---

*本仕様書は TaskQuest v1.1.0 の機能を網羅しています。*
