# TaskQuest デプロイ手順書

## 概要
Vercel（フロントエンド）+ Render（バックエンド + PostgreSQL）でのデプロイ手順

---

## 事前準備

### 必要なアカウント
- [GitHub](https://github.com) アカウント
- [Vercel](https://vercel.com) アカウント（GitHub連携）
- [Render](https://render.com) アカウント（GitHub連携）

### リポジトリ準備
1. GitHubにリポジトリを作成
2. task-questフォルダをプッシュ
```bash
cd task-quest
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/[YOUR_USERNAME]/task-quest.git
git push -u origin main
```

---

## Phase 1: Render（バックエンド + PostgreSQL）

### 1. PostgreSQLデータベース作成

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. **New** → **PostgreSQL** をクリック
3. 以下を設定:
   - **Name**: `taskquest-db`
   - **Region**: Oregon (US West)
   - **Plan**: Free
4. **Create Database** をクリック
5. 作成後、**Internal Database URL** をコピー

### 2. Web Service作成

1. **New** → **Web Service** をクリック
2. GitHubリポジトリ `task-quest` を選択
3. 以下を設定:
   - **Name**: `taskquest-api`
   - **Region**: Oregon (US West)
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm run build && npm start`
   - **Plan**: Free

4. **Create Web Service** をクリック

### 3. 環境変数設定

Web Serviceの **Environment** タブで以下を設定:

| 変数名 | 値 |
|--------|-----|
| `DATABASE_URL` | Step 1でコピーしたInternal Database URL |
| `JWT_SECRET` | 強力なランダム文字列（32文字以上推奨） |
| `GEMINI_API_KEY` | Google AI StudioのAPIキー |
| `FRONTEND_URL` | `https://[your-project].vercel.app`（後で設定） |
| `NODE_ENV` | `production` |

### 4. デプロイ確認

- デプロイが完了すると、`https://taskquest-api.onrender.com` のようなURLが発行される
- `/api/health` にアクセスして `{"status":"ok"}` が返ることを確認

---

## Phase 2: Vercel（フロントエンド）

### 1. プロジェクト作成

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. **Add New** → **Project** をクリック
3. GitHubリポジトリ `task-quest` を選択
4. 以下を設定:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js

### 2. 環境変数設定

**Environment Variables** セクションで以下を設定:

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | `https://taskquest-api.onrender.com`（RenderのURL） |

### 3. デプロイ

**Deploy** をクリックして完了を待つ

### 4. Render側のFRONTEND_URLを更新

Vercelで発行されたURL（例: `https://taskquest.vercel.app`）を Render の `FRONTEND_URL` 環境変数に設定

---

## 動作確認

1. Vercelのフロントエンドにアクセス
2. ユーザー登録してログイン
3. タスク作成・完了を試す
4. ランキング・報酬が動作することを確認

---

## トラブルシューティング

### CORS エラー
- Render の `FRONTEND_URL` が正しく設定されているか確認
- Vercel のデプロイ後に Render を再デプロイ

### データベース接続エラー
- `DATABASE_URL` が Internal URL であることを確認（External URLではない）
- Prisma migrate が成功しているかログを確認

### 認証エラー
- `JWT_SECRET` が設定されているか確認
- フロントエンドの `NEXT_PUBLIC_API_URL` が正しいか確認

---

## 費用

| サービス | プラン | 費用 |
|----------|--------|------|
| Vercel | Hobby | 無料 |
| Render Web Service | Free | 無料（15分無使用でスリープ） |
| Render PostgreSQL | Free | 無料（90日後削除） |

> ⚠️ Renderの無料プランはスリープするため、初回アクセスに時間がかかる場合があります。
> 本番運用には有料プラン（月$7〜）を推奨します。

---

**デプロイ完了後のURL例**:
- フロントエンド: `https://taskquest.vercel.app`
- バックエンドAPI: `https://taskquest-api.onrender.com`
