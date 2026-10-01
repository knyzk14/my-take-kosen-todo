# MyTakeKosenTodo

学校の課題、提出期限、提出方法をまとめて管理するToDoアプリケーションです。Firebase Authenticationでユーザーを認証し、ユーザーごとに分離した課題を管理します。

## 技術スタック

- フロントエンド: React、TypeScript、Vite、Tailwind CSS
- バックエンド: Go、標準 `net/http`
- データベース: PostgreSQL
- 認証: Firebase Authentication（Googleログイン）
- インフラ: Docker Compose、Cloudflare Tunnelを利用した外部公開を想定

## ディレクトリ構成

```text
.
├── backend/
│   ├── cmd/api/                 # Go APIサーバー
│   ├── internal/                # 認証、HTTPハンドラー、DB、通知処理
│   ├── internal/config/         # 科目・提出種別のマスターデータ
│   ├── migrations/              # PostgreSQL初期スキーマ
│   └── firebase-adminsdk.json   # Firebase Admin秘密鍵（Git管理対象外）
├── frontend/
│   ├── src/                     # React画面、認証、APIクライアント
│   ├── .env.example             # フロントエンド環境変数のサンプル
│   └── package.json
├── docker-compose.yml
└── README.md
```

## セットアップ

### 1. 環境変数とFirebase鍵

`frontend/.env.example` を `frontend/.env.local` にコピーし、Firebase ConsoleのWebアプリ設定値を入力します。

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

Googleログインを利用するには、Firebase ConsoleのAuthenticationでGoogleプロバイダーを有効にしてください。開発時は `VITE_API_BASE_URL` を空欄にするとViteの開発プロキシが `http://localhost:8080` へAPIを転送します。本番でフロントエンドとAPIを別オリジンに配置する場合は、公開APIのURLを設定し、バックエンド側のCORSも適切に許可してください。

Firebase Admin SDKのサービスアカウントJSONを `backend/firebase-adminsdk.json` に配置してください。この秘密鍵はComposeからコンテナ内の `/app/firebase-adminsdk.json` へ読み取り専用でマウントされます。`.env.local` とサービスアカウントJSONはGit管理対象外です。共有・公開しないでください。

PostgreSQLの接続情報はプロジェクトルートの `.env` で `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB` を指定できます。未指定の場合は開発用のCompose既定値が使われます。本番用途では必ず強固な値を設定してください。

### 2. バックエンドとデータベースの起動

プロジェクトルートで実行します。

```powershell
docker compose up -d --build backend
```

PostgreSQLも依存サービスとして起動します。状態とログは次のコマンドで確認できます。

```powershell
docker compose ps
docker compose logs -f backend
```

`backend/migrations/001_init.sql` はPostgreSQLデータボリュームの初回作成時に適用されます。既存ボリュームでは初期化SQLは再実行されません。

### 3. フロントエンドの起動

別のターミナルで実行します。

```powershell
cd frontend
npm ci
npm run dev
```

通常は `http://localhost:5173` で開発画面にアクセスできます。型チェックを含む本番ビルドは `npm run build` です。

## マスターデータの編集

科目と提出種別は `backend/internal/config/master_data.json` で管理します。科目には `name` とタイトル自動判別用の `keywords`、提出種別には `name` とURL自動判別用の `domains` を設定します。

```json
{
  "subjects": [
    { "name": "地理", "keywords": ["地理", "地理総合"] }
  ],
  "submission_types": [
    { "name": "Google Classroom", "domains": ["classroom.google.com"] }
  ]
}
```

マスターファイルはComposeで読み取り専用マウントされ、`GET /api/config` から配信されます。科目や提出種別を追加した後にコンテナを再ビルドする必要はありません。

## 外部公開

Cloudflare TunnelからAPIサーバーへ接続することで外部公開できます。トンネル、DNS、アクセス制御は利用するドメインと環境に合わせて別途設定してください。APIのコンテナポートは8080です。