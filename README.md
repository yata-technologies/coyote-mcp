# Coyote MCP Server

Claude Code から自然言語で Coyote のワークログ・タスク・イシューを操作できる MCP（Model Context Protocol）サーバーです。

---

## Claude Desktop Cowork（MCPB）でのセットアップ

Claude Desktop の Cowork 機能を使う場合は、`.mcpb` パッケージファイルからインストールします。

### 1. 拡張機能をインストールする

1. `.mcpb` ファイルを入手する（管理者から配布されます）
2. Claude Desktop を開く
3. **Settings → Extensions → Install Extension** を選択
4. `.mcpb` ファイルを選択してインストール

### 2. ログインする

新しい会話を開き、以下のように話しかけてください。

**English:**
> I installed a Coyote extension. Please log me in.

**日本語:**
> Coyoteという拡張機能をインストールしました。ログインしてください。

### 3. ブラウザで認証する

Claude がブラウザを開き、次のような応答を返します。

```
Your browser has been opened to: https://...

Enter this code on the page:
  XXXX-XXXX

Once you have approved the request in the browser, call coyote_login_complete.
```

表示されたコードをブラウザのページに入力して「承認」してください。

### 4. ログインを完了する

ブラウザで承認したら、Claude に以下のように伝えてください。

**English:**
> Done.

**日本語:**
> 承認しました。

Claude が自動的にログインを完了し、`✅ Authentication complete.` と表示されます。以降、Coyote のワークログ・タスク・イシューを自然言語で操作できます。

---

## 概要

Coyote MCP Server をインストールすると、Claude Code のチャット上で以下のような操作が可能になります。

- 「今日のワークログを記録して」
- 「自分のタスク一覧を見せて」
- 「CHR-1 の詳細を確認して」

内部では Claude Code が MCP ツールを呼び出し、Coyote API（Cloudflare Workers）と通信します。認証トークンはローカルの `~/.coyote/token` に保存されます。

---

## 必要環境

| 要件 | バージョン |
|---|---|
| Node.js | 18 以上 |
| Git | 任意（自動アップデート機能に使用） |
| Claude Code | 最新版 |

---

## インストール

### 1. リポジトリをクローン

クローン先は任意のディレクトリで構いません。以下は一例です。

```bash
git clone git@github.com-work:Yata-Technologies/coyote-mcp.git ~/work/coyote-mcp
```

### 2. インストールスクリプトを実行

```bash
bash ~/work/coyote-mcp/install.sh
```

クローン先を変えた場合は、パスを合わせて実行してください。

スクリプトが行うこと:

1. `npm install` と `npm run build` でビルド
2. `~/.coyote/config.json` を作成（初回のみ）
3. `~/.claude.json` に MCP サーバーエントリを登録
4. Coyoteのブラウザ認証（Device Authorization Grant）を起動

### 3. Coyoteのブラウザで認証

スクリプト実行後、ターミナルに以下のような出力が表示されます。

```
Open this URL in your browser:
  https://coyote.example.com/device

Then enter the code:
  XXXX-XXXX
```

表示された URL をブラウザで開き、コードを入力して認証を完了してください。
認証が完了するとターミナルに `✅ Authenticated` と表示されます。

### 4. Claude Code を再起動

認証完了後、Claude Code を再起動してください。以降、Claude Code のチャットから Coyote ツールが使えるようになります。

---

## 再認証

トークンの有効期限切れなどで再認証が必要な場合は、以下を実行してください。

```bash
node ~/work/coyote-mcp/dist/index.js login
```

---

## 自動アップデート

サーバー起動時に GitHub のリモートと差分を確認し、新しいバージョンがある場合は自動で `git pull` + ビルド + 再起動を行います。

自動アップデートを無効にする場合は `~/.coyote/config.json` を編集してください。

```json
{ "auto_update": false }
```

無効時は新バージョンが存在する旨の通知のみ行い、アップデートは手動で実施します。

```bash
cd ~/work/coyote-mcp && git pull && npm run build
```

---

## 利用可能なツール

| カテゴリ | ツール |
|---|---|
| 認証 | `coyote_login`, `coyote_get_me` |
| プロジェクト | `coyote_list_projects`, `coyote_list_members` |
| イシュー | `coyote_list_issues`, `coyote_get_issue`, `coyote_create_issue`, `coyote_update_issue`, `coyote_delete_issue` |
| タスク | `coyote_list_tasks`, `coyote_get_task`, `coyote_create_task`, `coyote_update_task`, `coyote_delete_task` |
| ワークログ | `coyote_list_worklogs`, `coyote_get_worklog`, `coyote_create_worklog`, `coyote_update_worklog`, `coyote_delete_worklog` |
| スプリント | `coyote_list_sprints`, `coyote_create_sprint`, `coyote_update_sprint`, `coyote_delete_sprint` |
| カテゴリ | `coyote_list_categories`, `coyote_create_category`, `coyote_update_category`, `coyote_delete_category` |
| フェーズ | `coyote_list_phases`, `coyote_create_phase`, `coyote_update_phase`, `coyote_delete_phase` |
| アクティビティ | `coyote_list_activities`, `coyote_create_activity`, `coyote_update_activity`, `coyote_delete_activity` |
| メンバー | `coyote_add_member`, `coyote_update_member_role`, `coyote_remove_member` |

---

## ローカルファイル

| パス | 内容 |
|---|---|
| `~/.coyote/token` | API トークン（`coy_xxx`） |
| `~/.coyote/config.json` | 設定（`auto_update` フラグ） |
| `~/.claude.json` | Claude Code への MCP サーバー登録情報 |
