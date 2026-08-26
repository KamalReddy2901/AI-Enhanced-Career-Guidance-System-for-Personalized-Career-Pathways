# Laya — Beginner Step-by-Step Implementation Guide

## 0. Complete the shared preflight first

Before editing, complete `../shared/AI_ASSISTED_IMPLEMENTATION_WORKFLOW.md` and read the branch, commit, Draft PR, review and no-self-merge sections in `../shared/GIT_BRANCH_COMMIT_PR_REVIEW_GUIDE.md`. **Do not follow its Windows-only environment/Command Prompt instructions.** Use the macOS preflight below instead. Production credentials remain with Kamal. If protected routes are unavailable locally, use only the approved controlled runtime/fixtures and record the limitation.

Read `../shared/BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`, then use the macOS-specific troubleshooting section at the end of this guide when platform advice differs.

## 1. macOS environment preflight

These instructions apply to both Apple Silicon (M-series) and Intel Macs running a reasonably current macOS version.

### 1.1 Install and verify the tools

1. Install GitHub Desktop for macOS from `https://desktop.github.com/`. Move it to **Applications** if macOS asks, sign in to GitHub, then verify the account under **GitHub Desktop → Settings → Accounts**. Older versions may call this **Preferences**.
2. Install VS Code for macOS from `https://code.visualstudio.com/`. The Universal build is simplest; otherwise select Apple Silicon for an M-series Mac or Intel for an Intel Mac. Move it to **Applications** and open it once.
3. Install Node.js `22.16.0` using the official macOS package: `https://nodejs.org/dist/v22.16.0/node-v22.16.0.pkg`.
4. Close any Terminal and VS Code terminal windows that were open during installation, then open a fresh VS Code terminal.
5. Run:

```bash
node -v
npm -v
```

Checkpoint: `node -v` must print `v22.16.0`. The npm version may differ. If `node` is not found, close and reopen Terminal/VS Code, restart the Mac, then reinstall the official `.pkg` if necessary. Do not paste random PATH or shell-startup commands from the internet.

### 1.2 Clone and open the repository

Use a normal local folder such as `~/Developer/GitHub` or `~/GitHub`. Avoid an iCloud Drive-synced Desktop/Documents location because it can cause permission, locking and `node_modules` problems.

In GitHub Desktop:

1. Choose **File → Clone Repository → URL**.
2. Paste `https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways.git`.
3. Choose the local folder and clone.
4. Choose **Repository → Open in Visual Studio Code**.

In VS Code choose **Terminal → New Terminal**. Modern macOS normally opens `zsh`; that is correct. Do not switch shells or weaken macOS security settings. Verify the terminal folder:

```bash
pwd
ls
```

Checkpoint: `ls` must show `package.json` before running npm commands.

### 1.3 Install dependencies safely

```bash
npm ci
```

Warnings are not automatically failures; a final `npm ERR!` is a failure. Never run `sudo npm ci` or `sudo npm install` in CareerCase. Never delete `package-lock.json`, edit `node_modules`, create an unapproved `.env.local`, or request Kamal's Supabase/Cloudflare/API credentials.

Checkpoint: `npm ci` returns to the prompt without a final error.

## 2. Prepare the assigned branch

Read the shared pack and your task/rules. Then run in the same VS Code `zsh` terminal:

```bash
git fetch origin
git switch integration/sih26044-product-v0.2
git pull --ff-only origin integration/sih26044-product-v0.2
git switch -c feature/laya/student-explorer-readiness-pr1
npm ci
npm run typecheck
```

If the last command fails before your edits, save its output and tell Kamal.

Checkpoint: `node -v` is `v22.16.0`, Git shows `feature/laya/student-explorer-readiness-pr1`, baseline typecheck passes, and the AI inspection report names only allowed files. Do not continue until all four are true. In GitHub Desktop, **Current Branch** must show the same feature branch before you edit anything.

## 3. Inspect before editing

Open `domain/opportunity.ts`, `domain/readiness.ts`, Engine B output, SIH services, demo types/fixtures/reducer, `DemoPages.tsx`, `ReadinessVector.tsx` and `RequirementEvidenceMatrix.tsx`. Write a private field-to-source checklist. Ask your AI to identify reuse and proposed files; do not let it edit yet.

## 4. Build explorer first

Create only Laya-owned components. Start with fixture/runtime data already supplied. Render a list, then add explicit filters one at a time. Add the zero-result reset action. Make every card link with a stable opportunity ID. Preview after each step.

Commit: `feat(student): add opportunity explorer`

## 5. Build detail and casefile

Render requirements from typed data; do not type them again manually. Add version/source/status. Then render the canonical readiness object using existing visual components. For each requirement, show state, explanation and evidence reference. Manually test one `UNKNOWN` requirement and one supported requirement.

Commit: `feat(readiness): add student readiness casefile`

## 6. Add navigation handoffs

Add links containing identifiers only: evidence route for Manvil; plan/application route for Madhu. If shared route registration is needed, prepare the smallest diff and request Kamal's approval before committing it.

## 7. Preview and test states on the Mac

Start the local app in the VS Code terminal:

```bash
npm run dev
```

Use the exact Local URL Vite prints, even if it uses port `5174` or another port. Command-click the URL or open it in Safari/Chrome. A protected route redirect to `/auth` or unavailable live AI may be expected without production configuration; do not request credentials to bypass it. Stop the server with **Control+C**, not Command+C.

Check normal, no results, no readiness, stale version, error and unauthorized states. Use keyboard only once. Resize to about 375px width. Confirm status is understandable without color. Save the exact URL and screenshots of the explorer, casefile and an `UNKNOWN` state.

```bash
npm run typecheck
npm run qa:opportunity-readiness
npm run qa:demo-flow
npm run qa:demo-isolation
npm run qa:sih-boundary
npm run build
```

## 8. Commit, push and open the Draft PR

Review `git diff`, commit coherent milestones, and push the same feature branch. In GitHub Desktop, inspect every green/red diff, commit to `feature/laya/student-explorer-readiness-pr1`, choose **Push origin**, then **Preview Pull Request/Create Pull Request**. On GitHub confirm the PR points from Laya's feature branch into `integration/sih26044-product-v0.2`, and choose **Create draft pull request**.

Paste the shared checklist and include desktop/mobile/UNKNOWN screenshots. State clearly which data is controlled prototype and list any approved shared-file patch.

Success means a beginner reviewer can follow explorer → opportunity detail → version-aligned readiness casefile, understand every state without a match/hiring score, and reproduce the recorded checks. Push review corrections to the same Draft PR. Never self-merge. If blocked, send Kamal the evidence package from the shared troubleshooting guide.

## 9. macOS troubleshooting and evidence

| Problem | Safe action |
|---|---|
| `zsh: command not found: node` or `npm` | Close VS Code and Terminal, reopen, run `node -v`; restart the Mac and reinstall the official Node `.pkg` if needed. Do not edit shell startup files with random commands. |
| `package.json` not found | Run `pwd` and `ls`. Open the CareerCase repository folder; do not run npm until `ls` shows `package.json`. |
| `EACCES`, `EPERM` or locked files | Stop the dev server, close extra terminals and prefer `~/Developer/GitHub` outside iCloud Drive. Never retry with `sudo npm…`. |
| “Operation not permitted” or file-access prompt | If the repository is intentionally in Desktop/Documents, allow VS Code/Terminal access in the macOS prompt; moving to `~/Developer/GitHub` is preferred. |
| `xcode-select`, compiler or `make` error during `npm ci` | Only when the error explicitly requests developer tools, run `xcode-select --install`, complete Apple's installer, then retry once. |
| Port `5173` already used | Open the different Local URL printed by Vite, or stop the other dev server with Control+C. |
| GitHub Desktop authentication fails | Open **GitHub Desktop → Settings → Accounts**, sign out, then sign in again. |

If still blocked, send Kamal: your name/GitHub username; guide step; `node -v`; `pwd`; `git status --short --branch`; the exact command/action; full terminal screenshot with final error; browser screenshot with address bar when applicable; changed-file list; and what you tried once. Never include credentials, `.env` contents, real personal data or private evidence.
