# Beginner Troubleshooting and Evidence to Send Kamal

Do not send only “it is not working.” Stop after one safe retry and send enough evidence to diagnose the exact state. Never paste credentials, `.env` values, tokens, real personal data or private evidence.

## Common setup and workflow problems

| Problem | Check | Safe action |
|---|---|---|
| `node` is not recognized | `node -v` in a fresh Command Prompt | Close VS Code/terminals, reopen; if still failing, restart Windows and verify Node.js `22.16.0` installation/PATH. |
| `npm.ps1` cannot run | Terminal says PowerShell | Switch VS Code default terminal profile to Command Prompt. Do not weaken Windows execution policy. |
| `package.json` not found | Current terminal path | Open the repository folder in VS Code; the terminal must be in the folder containing `package.json`. |
| `npm ci` engine/dependency failure | `node -v`; final `npm ERR!` lines | Confirm `v22.16.0`, retry once on a stable network, then send the complete final error. Do not delete `package-lock.json` or edit `node_modules`. |
| `EPERM`/locked files | Repo location and running processes | Stop the dev server, close extra terminals, avoid a heavily synced OneDrive folder, retry once. |
| Port `5173` already used | Vite terminal output | Open the different Local URL Vite prints, or stop the other server with `Ctrl+C`. |
| Route redirects to `/auth` or live AI is unavailable | Public page/dev server works | This may be expected without Kamal's production configuration. Do not request or create credentials; record the limitation. |
| Blank/error page | Browser console is not enough by itself | Capture browser with address bar and full terminal; include the exact route and action that caused it. |
| Wrong Git branch | `git status --short --branch` or GitHub Desktop Current branch | Stop editing. Do not move commits/reset history yourself. Send branch/status evidence to Kamal. |
| Merge/rebase conflict | Names of conflicted files | Do not discard either side or edit protected files. Send status, conflict filenames and the command/action that caused it. |
| Typecheck/build/QA failure | First failure and complete final output | Run the failing command once more only if the cause was transient. Save complete output and do not claim a pass. |
| Missing domain field or authorized method | Current contract/service inspected | Do not invent a parallel type or browser write. Send a shared-contract request with the required field/action and reason. |

## Evidence package to send Kamal

Send all applicable items:

1. Your name, GitHub username, assigned workstream and exact guide step/milestone.
2. Output of `node -v` and `git status --short --branch`.
3. Exact command or GitHub Desktop action that failed.
4. Full terminal screenshot including the final error lines; copyable text is helpful too.
5. Browser screenshot including the full address bar if UI behavior is affected.
6. Exact route, role/fixture used, expected result and actual result.
7. Changed-file list from `git status --short`.
8. What you already tried, once, and what happened.
9. Whether the problem touches a protected/shared file, consent/privacy boundary, Engine B, Worker/RPC, migration or production integration.

Good message:

```text
I am Madhu, at M4 consent/finalization. node -v is v22.16.0 and my branch is
feature/madhu/gap-closure-application-pr1. npm run qa:recruiter-projection fails
after one retry. I expected the controlled application preview to pass; it reports
the attached prohibited-key assertion. Attached: complete terminal, browser route,
git status, changed-file list, and what I tried. No credentials or real data included.
```

## Stop without attempting a workaround

Stop immediately for a secret/credential request, unexpected real personal data, suspected private-data leak, automatic rejection/ranking behavior, evidence/provenance mutation, consent bypass, direct trusted-table write, unapproved migration/Worker/shared-contract change, or a request to represent an unavailable integration as live.
