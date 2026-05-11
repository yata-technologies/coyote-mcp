// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const TOKEN_DIR = join(homedir(), '.coyote')
const TOKEN_FILE = join(TOKEN_DIR, 'token')

export function readToken(): string | null {
  try {
    return readFileSync(TOKEN_FILE, 'utf8').trim() || null
  } catch {
    return null
  }
}

export function writeToken(token: string): void {
  mkdirSync(TOKEN_DIR, { recursive: true })
  writeFileSync(TOKEN_FILE, token, { mode: 0o600 })
}

export function deleteToken(): void {
  try {
    const { unlinkSync } = require('fs')
    unlinkSync(TOKEN_FILE)
  } catch {}
}
