# Coyote MCP Server

A MCP (Model Context Protocol) server that lets you manage Coyote worklogs, tasks, and issues from Claude Code using natural language.

---

## Overview

Once installed, you can interact with Coyote directly from Claude Code chat:

- "List my tasks that are due today."
- "Start implementing task ABC-987 now."
- "Log my time for testing ABC-987 starting now."

Claude Code calls MCP tools under the hood, which communicate with the Coyote API (Cloudflare Workers). Your auth token is stored locally at `~/.coyote/token`.

---

## Requirements

| Requirement | Version |
|---|---|
| Node.js | 18 or later |
| Git | Any (used for auto-update) |
| Claude Code | Latest |

---

## Installation

### 1. Clone the repository

You can clone to any directory. For example:

```bash
cd ~/work
git clone git@github.com-work:Yata-Technologies/coyote-mcp.git
```

### 2. Run the install script

```bash
cd coyote-mcp
bash ./install.sh
```

Adjust the path if you cloned elsewhere.

### 3. Authenticate in the browser

After the script runs, the terminal will display something like:

```
Open this URL in your browser:
  https://coyote.pages.dev/activate

Then enter the code:
  XXXX-XXXX
```

Open the URL in your browser, enter the code, and complete authentication.
Once done, the terminal will show `✅ Authenticated`.

### 4. Restart Claude Code

After authentication, restart Claude Code. Coyote tools will be available in chat.

---

## Re-authentication

If your token expires or you need to re-authenticate:

```bash
node ~/work/coyote-mcp/dist/index.js login
```

---

## Auto-update

On startup, the server checks for new commits on the remote and automatically runs `git pull` + build + restart if a newer version is available.

To disable auto-update, edit `~/.coyote/config.json`:

```json
{ "auto_update": false }
```

When disabled, you will be notified of new versions but updates must be applied manually:

```bash
cd ~/work/coyote-mcp && git pull && npm run build
```

---

## Available Tools

| Category | Tools |
|---|---|
| Auth | `coyote_login`, `coyote_login_complete`, `coyote_get_me` |
| Projects | `coyote_list_projects`, `coyote_list_members` |
| Issues | `coyote_list_issues`, `coyote_get_issue`, `coyote_create_issue`, `coyote_update_issue`, `coyote_delete_issue` |
| Tasks | `coyote_list_tasks`, `coyote_get_task`, `coyote_create_task`, `coyote_update_task`, `coyote_delete_task` |
| Worklogs | `coyote_list_worklogs`, `coyote_get_worklog`, `coyote_create_worklog`, `coyote_update_worklog`, `coyote_delete_worklog` |
| Sprints | `coyote_list_sprints`, `coyote_create_sprint`, `coyote_update_sprint`, `coyote_delete_sprint` |
| Categories | `coyote_list_categories`, `coyote_create_category`, `coyote_update_category`, `coyote_delete_category` |
| Phases | `coyote_list_phases`, `coyote_create_phase`, `coyote_update_phase`, `coyote_delete_phase` |
| Activities | `coyote_list_activities`, `coyote_create_activity`, `coyote_update_activity`, `coyote_delete_activity` |
| Members | `coyote_add_member`, `coyote_update_member_role`, `coyote_remove_member` |

---

## Local Files

| Path | Contents |
|---|---|
| `~/.coyote/token` | API token (`coy_xxx`) |
| `~/.coyote/config.json` | Config (`auto_update` flag) |
| `~/.claude.json` | MCP server registration for Claude Code |
