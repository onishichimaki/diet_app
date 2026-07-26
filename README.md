# Health Pocket

食事、体重、活動、睡眠を日付別に管理する、モバイルファーストの健康管理PWAです。Supabaseを設定するとログインした端末間でデータを同期でき、未設定時やオフライン時もブラウザのLocal Storageで利用できます。

## 主な機能

- 日付を切り替えられる今日のダッシュボードとカロリー/PFC集計
- 朝食・昼食・夕食・間食の登録・削除
- 体重、歩数、距離、種別付き運動、睡眠の記録
- 実際の保存データから生成する日・週・月レポート
- カロリー、目標体重、歩数、睡眠の目標設定
- 35日分のサンプル履歴、空データ開始、初期化、JSONエクスポート
- Local Storageのスキーマ検証と、Service Workerによるオフライン動作
- Supabase Authのメールリンクログインと、ユーザー単位のクラウド同期
- インストール可能なManifestとマスカブルアイコン

## ローカルで起動する

Node.js 20以上をインストールしたPCで、このリポジトリのフォルダーをターミナルから開きます。

```bash
npm install
npm run local
```

ターミナルに`Ready`と表示されたら、ターミナルを閉じずに <http://localhost:3000> を開きます。`local`コマンドは外部アクセス可能な`0.0.0.0:3000`へ明示的にバインドします。

### Dockerで起動する

Docker Desktopがある場合は、Node.jsを個別にインストールせず起動できます。

```bash
docker compose up --build
```

起動後は <http://localhost:3000> を開きます。終了は`Ctrl+C`、バックグラウンド起動は`docker compose up --build -d`、停止は`docker compose down`です。

## 開発・品質チェック

```bash
npm test
npm run lint
npm run build
npm run preview
```

Service Workerは本番環境で登録されるため、オフライン動作は`npm run build && npm run preview`で確認します。

## データとプライバシー

端末内の保存キーは`health-pocket-data-v2`です。「目標」画面からJSONバックアップをダウンロードでき、全データをサンプル状態へ初期化できます。Supabase未設定または未ログインの場合、ブラウザデータを消去すると記録も削除されるため、必要に応じてバックアップしてください。

## Supabaseでクラウド同期を有効にする

1. SupabaseでProjectを作成します。
2. SQL Editorで`supabase/migrations/001_health_stores.sql`を実行します。このSQLはRLSを有効化し、各ユーザーが自分のデータだけを操作できるポリシーも作成します。
3. AuthenticationのURL Configurationで、Site URLをVercelの本番URL（例：`https://diet-app-chimaki.vercel.app`）に設定します。ローカル開発ではRedirect URLsへ`http://localhost:3000/**`も追加します。
4. `.env.example`を`.env.local`へコピーし、SupabaseのProject URLとPublishable Key（旧プロジェクトではAnon Key）を設定します。

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

VercelではProject SettingsのEnvironment Variablesへ同じ2項目をProduction、Preview、Development用として登録し、Redeployします。旧設定との互換性のため`NEXT_PUBLIC_SUPABASE_ANON_KEY`も利用できますが、新規設定ではSupabaseの表示名と同じ`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`を使用します。`service_role`キーやデータベースパスワードは、ブラウザ用環境変数へ絶対に登録しないでください。

設定後はアプリの「健康」画面にある「クラウド同期」からメールアドレスを入力します。メールのログインリンクを開くと、クラウドにデータがない初回だけ現在の端末データを移行し、以降の変更を自動保存します。クラウドに既存データがある場合はクラウド側を端末へ復元します。

ブラウザとSupabase間のネットワーク制限やCORSの影響を避けるため、Supabase SDKの通信は同一オリジンの`/api/supabase/*`から固定されたProject URLへ中継します。中継先は環境変数のSupabase URL以外に変更できず、Service WorkerもAPI通信には介入しません。

中継APIはSupabase SDKのバージョンヘッダーを含むリクエスト・レスポンスヘッダーを保持し、ホップ単位のヘッダー、Cookie、Originだけを除外します。これによりOTP認証レスポンスをSDKが本来の形式で解釈できます。

## 技術構成

Next.js App Router / React / TypeScript / Tailwind CSS / Vitest。詳しくは[設計資料](docs/DESIGN.md)を参照してください。
