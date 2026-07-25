# Health Pocket

食事、体重、活動、睡眠を日付別に管理する、モバイルファースト・ローカルファーストの健康管理PWAです。個人データはブラウザのLocal Storageに保存され、サーバーへ送信されません。

## 主な機能

- 日付を切り替えられる今日のダッシュボードとカロリー/PFC集計
- 朝食・昼食・夕食・間食の登録・削除
- 体重、歩数、距離、種別付き運動、睡眠の記録
- 実際の保存データから生成する日・週・月レポート
- カロリー、目標体重、歩数、睡眠の目標設定
- 35日分のサンプル履歴、空データ開始、初期化、JSONエクスポート
- Local Storageのスキーマ検証と、Service Workerによるオフライン動作
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

保存キーは`health-pocket-data-v2`です。「目標」画面からJSONバックアップをダウンロードでき、全データをサンプル状態へ初期化できます。ブラウザデータを消去すると記録も削除されるため、必要に応じてバックアップしてください。

## 技術構成

Next.js App Router / React / TypeScript / Tailwind CSS / Vitest。詳しくは[設計資料](docs/DESIGN.md)を参照してください。
