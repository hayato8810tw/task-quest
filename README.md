# TaskQuest 🎮

**企業向けゲーミフィケーションタスク管理システム**

タスク管理にゲームの要素を取り入れ、日々の業務を楽しく、達成感のあるものに変えるWebアプリケーションです。

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Express](https://img.shields.io/badge/Express-4-green?style=flat-square&logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)

---

## 🌐 本番環境

| サービス | URL |
|----------|-----|
| **フロントエンド** | https://task-quest-six.vercel.app |
| **バックエンドAPI** | https://taskquest-api.onrender.com |

---

## ✨ 特徴

- 🎯 **タスク完了でポイント＆XP獲得** - やればやるほど成長！
- 🏆 **ランキング機能** - チームメンバーと競い合い
- 🎁 **報酬交換システム** - ポイントを報酬に交換
- 🔥 **ログインストリーク** - 連続ログインでボーナス
- 🏅 **バッジシステム** - 実績を解除してコレクション
- 🤖 **AI推奨機能** - タスクに最適なポイント/XPを自動提案（Gemini 2.5 Flash）
- ✏️ **編集機能** - プロジェクト・エピック・タスクを作成後に編集可能

---

## 🚀 クイックスタート

### 必要環境

- Node.js 18以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/hayato8810tw/task-quest.git
cd task-quest

# バックエンドセットアップ
cd backend
npm install
cp .env.example .env  # 環境変数を設定
npx prisma migrate dev
npx prisma db seed  # 初期データを投入
npm run dev

# フロントエンドセットアップ（別ターミナル）
cd frontend
npm install
npm run dev
```

### ローカルアクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3001

---

## 📖 使い方ガイド

### 1️⃣ ユーザー登録・ログイン

1. アプリにアクセス
2. 「新規登録」をクリック
3. 社員ID、メールアドレス、パスワード、表示名を入力
4. 登録後、自動的にダッシュボードへ

### 2️⃣ ダッシュボード

ログイン後のホーム画面です。

- **レベル・XP**: 現在のレベルと次のレベルまでの進捗
- **ポイント**: 使用可能ポイントと累計ポイント
- **ログインストリーク**: 連続ログイン日数
- **あなたのタスク**: 割り当てられたタスク一覧

> 💡 **ログインボーナス**: 毎日ログインして「ログインボーナスを受け取る」ボタンをクリック！連続日数に応じてボーナス増加！

### 3️⃣ タスク管理

#### タスク一覧（/tasks）

- **グリッド表示**: タスクがカード形式で一覧表示
- **ステータス順**: 進行中→未着手→完了済み の順で表示
- **色分け**:
  - 🔵 青背景 = 進行中
  - ⚪ 標準 = 未着手
  - 🩶 薄いグレー = 完了済み
- **優先度ボーダー**:
  - 🔴 赤 = 緊急
  - 🟠 オレンジ = 高
  - 🟡 黄色 = 中
  - ⚪ グレー = 低

#### タスク作成（/tasks/new）

1. 「+ 新規タスク」をクリック
2. タスク情報を入力:
   - タイトル・説明
   - 優先度・難易度
   - 期限（任意）
   - 担当者を選択
3. **🤖 AI推奨ボタン**: クリックするとAIが最適なポイント・XPを自動計算
4. 所属先（プロジェクト・エピック）を選択または新規作成
5. 「タスクを作成」をクリック

> 💡 **自動選択**: プロジェクト詳細ページから「+ タスクを追加」をクリックすると、プロジェクトとエピックが自動的に選択されます。

#### タスクの進め方

```
未着手 → [▶ 開始] → 進行中 → [✓ 完了] → 完了
```

完了すると設定されたポイントとXPを獲得！

#### タスク・エピック・プロジェクトの編集

プロジェクト詳細ページで、各項目の横にある ✏️ ボタンをクリックすると編集モーダルが開きます。

- **プロジェクト**: タイトル・説明の編集
- **エピック**: タイトル・説明の編集
- **タスク**: タイトル・説明・優先度・難易度・ポイント・XPの編集

### 4️⃣ プロジェクト管理

#### 階層構造

```
プロジェクト（大分類）
  └── エピック（中分類）
       └── タスク（実行単位）
```

#### プロジェクト一覧（/projects）

- 全プロジェクトの進捗状況を表示
- チームメンバー管理（MANAGER以上）

#### プロジェクト詳細

- エピック・タスクを階層表示
- その場でタスクのステータス変更可能
- エピック・タスクの追加・編集

### 5️⃣ ランキング（/leaderboard）

チームメンバーとの競争を楽しめます！

| タブ | 集計期間 |
|------|----------|
| デイリー | 本日の獲得ポイント |
| ウィークリー | 今週の獲得ポイント |
| マンスリー | 今月の獲得ポイント |
| 年間 | 今年の獲得ポイント |
| 累計 | 全期間の累計ポイント |

### 6️⃣ 報酬交換（/rewards）

獲得したポイントで報酬をゲット！

1. 報酬カタログから欲しい報酬を選択
2. 必要ポイントを確認
3. 「ポイントで交換」をクリック
4. 交換履歴で確認

> ⚠️ 報酬は管理者が追加・管理します

### 7️⃣ バッジ（/badges）

実績を達成するとバッジを獲得！

**獲得条件の例**:
- タスク完了数: 10件、50件、100件...
- 連続ログイン: 7日、30日、100日...
- 累計ポイント: 1000pt、5000pt...

### 8️⃣ アーカイブ（/archives）

完了したタスク・エピック・プロジェクトを整理。

1. 「+ 完了済みをアーカイブ」をクリック
2. アーカイブ候補が表示
3. 個別または「📦 一括アーカイブ」で整理
4. 必要に応じてアーカイブ解除可能

---

## 👤 ユーザーロール

| ロール | できること |
|--------|------------|
| **USER** | タスク閲覧・実行、報酬交換、プロフィール編集 |
| **MANAGER** | + プロジェクト・エピック・タスク作成・編集、チーム管理 |
| **ADMIN** | + ユーザー管理、報酬管理、全機能アクセス |

---

## ⚙️ 環境変数

### バックエンド（backend/.env）

```env
DATABASE_URL="postgresql://..."  # PostgreSQL接続URL
JWT_SECRET="your-super-secret-key"
GEMINI_API_KEY="your-gemini-api-key"  # AI機能用
```

### フロントエンド（Vercel）

```env
NEXT_PUBLIC_API_URL="https://taskquest-api.onrender.com"
```

### Gemini API キーの取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Create API key」でキーを作成
3. Renderの環境変数 `GEMINI_API_KEY` に設定

---

## 🗂️ ディレクトリ構成

```
task-quest/
├── frontend/              # Next.js フロントエンド
│   ├── src/
│   │   ├── app/          # ページコンポーネント
│   │   ├── components/   # 共通コンポーネント
│   │   └── lib/          # ユーティリティ・API
│   └── package.json
│
├── backend/               # Express バックエンド
│   ├── src/
│   │   ├── routes/       # APIルート
│   │   ├── middleware/   # ミドルウェア
│   │   └── index.ts      # エントリーポイント
│   ├── prisma/
│   │   ├── schema.prisma # DBスキーマ
│   │   └── seed.ts       # 初期データ
│   └── package.json
│
├── SPECIFICATION.md       # 詳細仕様書
├── DEPLOYMENT.md          # デプロイ手順書
└── README.md              # このファイル
```

---

## 🔧 開発コマンド

### バックエンド

```bash
cd backend

# 開発サーバー起動
npm run dev

# データベースマイグレーション
npx prisma migrate dev

# Prisma Studioでデータ確認
npx prisma studio

# 初期データ投入
npx prisma db seed
```

### フロントエンド

```bash
cd frontend

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Lint
npm run lint
```

---

## 📝 API概要

詳細は [SPECIFICATION.md](./SPECIFICATION.md) を参照。

| カテゴリ | 主なエンドポイント |
|----------|-------------------|
| 認証 | POST /api/auth/login, /register |
| タスク | GET/POST/PATCH /api/tasks |
| プロジェクト | GET/POST/PATCH /api/projects |
| エピック | GET/POST/PATCH /api/epics |
| ログインボーナス | POST /api/login-bonus/claim |
| ランキング | GET /api/leaderboard?period=xxx |
| 報酬 | GET/POST /api/rewards, /redeem |
| AI | POST /api/ai/suggest-points |

---

## 🚀 デプロイ

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照。

### 使用サービス

| サービス | 用途 | プラン |
|----------|------|--------|
| Vercel | フロントエンド | Hobby（無料） |
| Render | バックエンド + PostgreSQL | Free |

---

## 📄 ライセンス

MIT License

---

## 📞 サポート

問題や質問がある場合は、Issueを作成してください。

---

**Happy Tasking! 🎮✨**
