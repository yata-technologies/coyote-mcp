// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT
//
// Worklog timezone helpers — COY-198. Mirror of the Coyote frontend's
// src/lib/worklog-tz.js, in TypeScript.
//
// Storage convention (Coyote API ≥ migration 0031): `worklogs.date`,
// `start_time`, `end_time` are UTC; the recorder's offset goes in
// `tz_offset_min` (minutes east of UTC). Legacy rows have NULL
// `tz_offset_min` and stay as wall-clock with no TZ shift.

function pad2(n: number): string { return String(n).padStart(2, '0') }

export function currentTzOffsetMin(): number {
  return -new Date().getTimezoneOffset()
}

function parseDate(dateStr: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

function parseTime(timeStr: string | null | undefined): { h: number; m: number; s: number } | null {
  if (!timeStr) return null
  const [h, m, s = 0] = timeStr.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return { h, m, s }
}

export type Parts = { date: string | null; start_time: string | null; end_time: string | null }

// UTC worklog fields → server process's local TZ. Legacy rows
// (tz_offset_min == null) pass through unchanged.
export function utcToLocal(
  parts: Parts & { tz_offset_min: number | null | undefined },
): Parts {
  const { date, start_time, end_time, tz_offset_min } = parts
  if (tz_offset_min == null) return { date, start_time, end_time }
  const dp = parseDate(date)
  const sp = parseTime(start_time)
  if (!dp || !sp) return { date, start_time, end_time }

  const startUtc = new Date(Date.UTC(dp.y, dp.m - 1, dp.d, sp.h, sp.m, sp.s))
  const localDate = `${startUtc.getFullYear()}-${pad2(startUtc.getMonth() + 1)}-${pad2(startUtc.getDate())}`
  const localStart = `${pad2(startUtc.getHours())}:${pad2(startUtc.getMinutes())}:${pad2(startUtc.getSeconds())}`

  let localEnd: string | null = null
  if (end_time) {
    const ep = parseTime(end_time)
    if (ep) {
      const endUtc = new Date(Date.UTC(dp.y, dp.m - 1, dp.d, ep.h, ep.m, ep.s))
      if (endUtc < startUtc) endUtc.setUTCDate(endUtc.getUTCDate() + 1)
      localEnd = `${pad2(endUtc.getHours())}:${pad2(endUtc.getMinutes())}:${pad2(endUtc.getSeconds())}`
    }
  }

  return { date: localDate, start_time: localStart, end_time: localEnd }
}

// Local fields → UTC plus tz_offset_min for submission. `end_time` may be null.
export function localToUtc(parts: Parts): Parts & { tz_offset_min: number } {
  const { date, start_time, end_time } = parts
  const dp = parseDate(date)
  const sp = parseTime(start_time)
  if (!dp || !sp) {
    return { date, start_time, end_time, tz_offset_min: currentTzOffsetMin() }
  }
  const startLocal = new Date(dp.y, dp.m - 1, dp.d, sp.h, sp.m, sp.s)
  const utcDate = `${startLocal.getUTCFullYear()}-${pad2(startLocal.getUTCMonth() + 1)}-${pad2(startLocal.getUTCDate())}`
  const utcStart = `${pad2(startLocal.getUTCHours())}:${pad2(startLocal.getUTCMinutes())}:${pad2(startLocal.getUTCSeconds())}`

  let utcEnd: string | null = null
  if (end_time) {
    const ep = parseTime(end_time)
    if (ep) {
      const endLocal = new Date(dp.y, dp.m - 1, dp.d, ep.h, ep.m, ep.s)
      utcEnd = `${pad2(endLocal.getUTCHours())}:${pad2(endLocal.getUTCMinutes())}:${pad2(endLocal.getUTCSeconds())}`
    }
  }

  return { date: utcDate, start_time: utcStart, end_time: utcEnd, tz_offset_min: currentTzOffsetMin() }
}

// Today in the server's local TZ as YYYY-MM-DD.
export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
// Note: there is intentionally no "now"-as-start_time helper. Worklog start
// must be the actual work start, never the submission clock time (COY-206).
