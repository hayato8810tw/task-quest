# TaskQuest デプロイ手順書

## 概要
Vercel（フロントエンド）+ Render（バックエンド + PostgreSQL）でのデプロイ手順

---

## 本番環境URL

| サービス | URL |
|----------|-----|
| **フロントエンド** | https://task-quest-six.vercel.app |
| **バックエンドAPI** | https://taskquest-api.onrender.com |
| **API ヘルスチェック** | https://taskquest-api.onrender.com/api/health |

---

## 事前準備

### 必要なアカウント
- [GitHub](https://github.com) アカウント
- [Vercel](https://vercel.com) アカウント（GitHub連携）
- [Render](https://render.com) アカウント（GitHub連携）
- [Google AI Studio](https://aistudio.google.com) アカウント（Gemini API用）

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
   - **Region**: Oregon (US West) または Singapore
   - **Plan**: Free
4. **Create Database** をクリック
5. 作成後、**Internal Database URL** をコピー

### 2. Web Service作成

1. **New** → **Web Service** をクリック
2. GitHubリポジトリ `task-quest` を選択
3. 以下を設定:
   - **Name**: `taskquest-api`
   - **Region**: Oregon (US West) または Singapore
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run db:seed`
   - **Start Command**: `npm run build && npm start`
   - **Plan**: Free

4. **Create Web Service** をクリック

> ⚠️ Build Commandに `npm run db:seed` を含めると、デプロイ時にデモユーザーが自動作成されます。

### 3. 環境変数設定

Web Serviceの **Environment** タブで以下を設定:

| 変数名 | 値 |
|--------|-----|
| `DATABASE_URL` | Step 1でコピーしたInternal Database URL |
| `JWT_SECRET` | 強力なランダム文字列（32文字以上推奨） |
| `GEMINI_API_KEY` | Google AI StudioのAPIキー |
| `PORT` | `3001`（または任意） |

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

---

## デモユーザー

デプロイ後、以下のデモアカウントでログイン可能:

| 社員ID | パスワード | 役割 |
|--------|----------|------|
| `EMP001` | `password123` | USER |
| `MGR001` | `password123` | MANAGER |
| `ADMIN001` | `password123` | ADMIN |

---

## 動作確認

1. Vercelのフロントエンドにアクセス
2. デモユーザーまたは新規登録してログイン
3. タスク作成・完了を試す
4. ランキング・報酬が動作することを確認
5. AI推奨値機能をテスト（タスク作成時）

---

## 更新・再デプロイ

### 自動デプロイ
GitHubにプッシュすると、VercelとRenderの両方が自動的に再デプロイされます。

```bash
git add .
git commit -m "Update feature"
git push
```

### 手動デプロイ
- **Vercel**: ダッシュボードから "Redeploy" ボタン
- **Render**: ダッシュボードから "Manual Deploy" ボタン

---

## トラブルシューティング

### CORS エラー
- バックエンドの `src/index.ts` で CORS が `origin: true` になっているか確認
- Renderを再デプロイ

### データベース接続エラー
- `DATABASE_URL` が Internal URL であることを確認（External URLではない）
- Prisma migrate が成功しているかログを確認

### 認証エラー（Invalid credentials）
- データベースにユーザーが存在するか確認
- Build Commandに `npm run db:seed` が含まれているか確認
- Renderを再デプロイ

### API Not Found エラー
- `NEXT_PUBLIC_API_URL` が正しく設定されているか確認
- フロントエンドで `/api/api/...` のような重複パスになっていないか確認

### AI推奨値エラー
- Renderの環境変数 `GEMINI_API_KEY` が正しく設定されているか確認
- Google AI StudioでAPIキーが有効か確認

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

## 現在のデプロイ情報

| 項目 | 値 |
|------|-----|
| フロントエンド | https://task-quest-six.vercel.app |
| バックエンドAPI | https://taskquest-api.onrender.com |
| GitHubリポジトリ | https://github.com/hayato8810tw/task-quest |
| Render Service ID | srv-d5ir7t6r433s738n150g |
