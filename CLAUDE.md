# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のルールを定める。ここに記載されたルールはデフォルトの挙動より優先される。

---

## コミュニケーション言語

- **会話・コードコメント:** 英語
- **ドキュメント（`docs/` 配下・`CLAUDE.md`）:** 日本語

---

## 自律的判断

スコープや実装アプローチについて曖昧な選択肢がある場合、確認を求めずに合理的な判断を下して進める。判断内容を返答内で簡潔に述べるだけでよい。例外: 本番データ削除・force pushなど取り消し不能・高リスクな操作のみ事前確認する。

---

## プロジェクト概要

**coyote-mcp** — Coyote ワークログ管理プラットフォーム向けの MCP（Model Context Protocol）サーバー。Claude Code から自然言語でワークログ記録・タスク参照・イシュー閲覧を可能にする。

メインの Coyote リポジトリ（`github.com/Yata-Technologies/coyote`）から MCP コンポーネントを独立させたもの。コードの変更はこのリポジトリ単独で完結する。Coyote API との接続はすべて HTTP 経由。

---

## アーキテクチャ

```
ユーザー → 自然言語 → Claude Code
                           ↓ MCP tool call (stdio)
                    Coyote MCP Server（ローカル）
                           ↓ Bearer coy_xxx
                    Coyote Worker API（Cloudflare Workers）
                           ↓ SQL
                    D1 Database（Cloudflare）
```

**本番 API URL:** `https://coyote-api.yata-nakata.workers.dev`

MCP サーバーはユーザーのローカルマシン上で動作し、Claude Code の stdio 経由で通信する。Coyote API への接続には `~/.coyote/token` に格納された Bearer トークン（`coy_xxx` 形式）を使用する。

---

## ファイル構成

```
/
├── CLAUDE.md
├── README.md
├── install.sh          セットアップスクリプト（build + ~/.claude.json 登録 + 認証）
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        エントリポイント（起動 / login コマンド切り替え、自動アップデート）
    ├── lib/
    │   ├── client.ts   HTTP クライアント（Bearer 認証、GET/POST/PUT/DELETE）
    │   └── token.ts    ~/.coyote/token の読み書き
    └── tools/
        ├── auth.ts     coyote_login, coyote_get_me
        ├── tasks.ts    coyote_list_tasks, coyote_get_task, coyote_create_task, coyote_update_task, coyote_delete_task
        ├── issues.ts   coyote_list_issues, coyote_get_issue, coyote_create_issue, coyote_update_issue, coyote_delete_issue
        ├── worklogs.ts coyote_list_worklogs, coyote_get_worklog, coyote_create_worklog, coyote_update_worklog, coyote_delete_worklog
        ├── projects.ts coyote_list_projects, coyote_list_members
        ├── sprints.ts  coyote_list_sprints, coyote_create_sprint, coyote_update_sprint, coyote_delete_sprint
        ├── config.ts   categories / phases / activities の CRUD
        └── members.ts  coyote_add_member, coyote_update_member_role, coyote_remove_member
```

---

## コマンド

```bash
npm install          # 依存インストール
npm run build        # TypeScript → dist/ へコンパイル
npm run dev          # tsc --watch（開発時）
```

### インストール（ユーザー向け）

```bash
bash install.sh
```

install.sh が行うこと:
1. `npm install && npm run build`
2. `~/.coyote/config.json` を作成（未存在時、`auto_update: true`）
3. `~/.claude.json` の `mcpServers.coyote` にエントリを追加
4. Device Authorization Grant を起動（ブラウザ認証）

### ログイン（再認証）

```bash
node dist/index.js login
```

---

## 自動アップデート

`src/index.ts` の `tryAutoUpdate()` がサーバー起動時に実行される:

1. `git fetch origin main` でリモートとの差分を確認
2. 差分あり + `auto_update: true` → `git pull --ff-only` → `npm run build` → プロセス再起動
3. 差分あり + `auto_update: false` → 通知のみ
4. pull/build 失敗 → 既存ビルドで起動継続（フェイルセーフ）

`REPO_DIR` は `src/index.ts` の `__dirname` から2階層上（リポジトリルート）として計算される。

---

## バージョン管理

バージョンは `package.json` と `src/index.ts` の2箇所で管理する。**必ず両方を同時に更新すること。**

| ファイル | 箇所 |
|---|---|
| `package.json` | `"version"` フィールド |
| `src/index.ts` | `new Server({ name: 'coyote', version: '...' }, ...)` |

バグ修正・機能追加・リファクタリングを問わず、コードを変更してPRを作成する際は必ずパッチバージョン以上をインクリメントする。

---

## ツール命名規則

- すべてのツール名は `coyote_` プレフィックス
- 操作: `list_`, `get_`, `create_`, `update_`, `delete_`
- 例: `coyote_list_tasks`, `coyote_create_worklog`

### 新しいツールを追加する手順

1. `src/tools/` に新ファイル（または既存ファイルに追記）
2. ツール定義（`inputSchema`）とハンドラ関数をエクスポート
3. `src/index.ts` で import し、`ALL_TOOLS` と対応する Set に追加
4. ハンドラ呼び出しを `CallToolRequestSchema` ハンドラ内の分岐に追加

---

## Coyote API 仕様

### 認証

- ヘッダー: `Authorization: Bearer coy_xxx`
- トークン取得: Device Authorization Grant
  - `POST /auth/device/code` → `{ device_code, user_code, verification_uri, interval }`
  - `POST /auth/token` → `{ access_token }` or `{ error: "authorization_pending" | "expired_token" }`
- 認証済みユーザー取得: `GET /api/me` → `{ id, name, email, system_role }`

### スラグ形式

エンティティはプロジェクトキー + 連番のスラグで識別される:

| エンティティ | 例 |
|---|---|
| Issue | `CHR-1`, `CHR-42` |
| Task | `CHR-T1`, `CHR-T99` |
| Worklog | `CHR-W1`, `CHR-W10` |

API の GET/PUT/DELETE エンドポイントはスラグを受け付ける（UUID ではなく）。

### 主要エンドポイント

```
GET    /api/me
GET    /api/projects
GET    /api/issues?project_id=&sprint_id=&status=
GET    /api/issues/:slug
POST   /api/issues
PUT    /api/issues/:slug
DELETE /api/issues/:slug
GET    /api/tasks?owner_id=&issue_id=&project_id=&sprint_id=&status=
GET    /api/tasks/:slug
POST   /api/tasks
PUT    /api/tasks/:slug
DELETE /api/tasks/:slug
GET    /api/worklogs?user_id=&task_id=&project_id=&sprint_id=&date=&date_from=&date_to=
GET    /api/worklogs/:slug
POST   /api/worklogs
PUT    /api/worklogs/:slug
DELETE /api/worklogs/:slug
GET    /api/sprints?project_id=
POST   /api/sprints
PUT    /api/sprints/:id
DELETE /api/sprints/:id
GET    /api/members?project_id=
POST   /api/members
PUT    /api/members/:id
DELETE /api/members/:id
```

### "me" 解決パターン

`owner_id: "me"` や `user_id: "me"` が渡された場合、`GET /api/me` でユーザー ID を解決してから API を呼ぶ。`tasks.ts` と `worklogs.ts` の実装を参照。

---

## ローカルファイル（ユーザーマシン）

| パス | 内容 |
|---|---|
| `~/.coyote/token` | API トークン（`coy_xxx`）、パーミッション 0o600 |
| `~/.coyote/config.json` | `{ "auto_update": true }` |
| `~/.claude.json` | Claude Code の MCP サーバー登録（`mcpServers.coyote`） |

---

## Git・PRワークフロー

- **変更は必ずPRを作成する。** `main` への直接プッシュは行わない。
- ブランチ命名: `feat/`、`fix/`、`docs/` プレフィックス
- PRは `gh pr create` で作成する（`~/.claude/settings.json` の `GITHUB_TOKEN` を使用）
- ユーザーがテスト確認後、許可確認不要でAPIからマージする

---

## Coyote メインリポジトリとの関係

| 項目 | 値 |
|---|---|
| メインリポジトリ | `github.com/Yata-Technologies/coyote` |
| ローカルパス（開発者マシン） | `~/work/coyote` |
| API（Worker）ソース | `~/work/coyote/worker/` |
| フロントエンドソース | `~/work/coyote/src/` |

MCP サーバーはメインリポジトリの API スキーマに依存する。API に破壊的変更が加わった場合、このリポジトリのツール実装も更新が必要になる。
