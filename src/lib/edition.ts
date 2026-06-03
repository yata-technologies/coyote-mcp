// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { hostname, platform } from 'os'

// Human-readable api_token label identifying the client EDITION + machine.
//
// Edition is derived from whether the MCP is running inside a git checkout
// (the Claude Code / git install, which auto-updates via `git pull`) vs the
// packaged .mcpb bundle (the Claude Desktop Extension, which has no .git).
// This is the real edition signal — NOT which auth path ran. Earlier labels
// were hardcoded per auth path ("Coyote MCP" for the in-app login tool,
// "Claude Code" for the CLI `login` command), but both paths are reachable
// from the git install, so those strings tracked the login method, not the
// edition. Callers pass their own correctly-rooted IS_GIT_REPO.
export function editionLabel(isGitRepo: boolean): string {
  const edition = isGitRepo ? 'Coyote MCP' : 'Coyote Claude Desktop Extension'
  return `${edition} on ${hostname()} (${platform()})`
}
