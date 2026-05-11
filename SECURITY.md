# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `coyote-mcp`, **please do not file a public GitHub issue.**

Instead, report it privately via **[GitHub Security Advisories](https://github.com/yata-technologies/coyote-mcp/security/advisories/new)**. The maintainers (YATA Technologies) will receive the report directly and respond on the same channel.

## What to include

- A description of the issue and its impact
- Steps to reproduce, or a proof-of-concept
- Affected version(s) of `coyote-mcp`
- Any suggested mitigation, if you have one

## Response

We aim to acknowledge new reports within **3 business days** and to publish a fix or mitigation as soon as we have confirmed the issue. Coordinated disclosure timelines will be agreed with the reporter.

## Scope

In scope:

- `coyote-mcp` MCP server code in this repository
- The Coyote API endpoints it calls (`api.coyote-worklog.com`) — issues here will be triaged jointly with the Coyote backend team

Out of scope:

- Vulnerabilities in third-party dependencies (please report those upstream); we will still update affected dependencies once the upstream fix lands
- Issues that require physical access to a user's machine or already-compromised local accounts
