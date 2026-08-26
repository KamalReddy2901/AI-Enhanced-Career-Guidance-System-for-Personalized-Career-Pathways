# Beginner Git, Commit, PR and Review Guide

## Before starting on Windows

Use Windows 10/11, GitHub Desktop, VS Code and Node.js `22.16.0` (the version in `.node-version`). In VS Code, choose **Terminal → Select Default Profile → Command Prompt** if PowerShell reports that `npm.ps1` cannot run. Keep the repository outside a heavily synced OneDrive folder when possible.

Production credentials are not needed for branch work or the controlled local demo. They remain with Kamal. Protected routes, cloud persistence or live AI may be unavailable locally without approved configuration; do not “fix” that by creating an unapproved `.env.local`.

## One-time setup

GitHub Desktop path:

1. Choose **File → Clone repository → URL**.
2. Paste the CareerCase repository URL.
3. Choose a normal local folder such as `C:\Users\YOUR_NAME\Documents\GitHub`.
4. Choose **Repository → Open in Visual Studio Code**.
5. Open a Command Prompt terminal in VS Code and confirm that the folder contains `package.json`.

Command-line equivalent:

```bash
git clone https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways.git
cd AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways
npm ci
```

Never paste secrets into terminal history, source files, screenshots or PRs.

Checkpoint: `node -v` prints `v22.16.0`, `npm ci` finishes without a final `npm ERR!`, and `git status --short --branch` shows a clean working tree before task work.

## Start your PR1 branch

Replace `<name>` and `<slug>` with the assigned values in your task plan.

```bash
git fetch origin
git switch integration/sih26044-product-v0.2
git pull --ff-only origin integration/sih26044-product-v0.2
git switch -c feature/<name>/<slug>-pr1
git status
```

The status must name your feature branch. Never work directly on `main`, Foundation or integration.

GitHub Desktop equivalent: **Fetch origin**, choose **Current branch → integration/sih26044-product-v0.2**, choose **Pull origin**, then **Current branch → New branch** and enter the exact assigned feature-branch name. Check the branch name at the top before editing.

Checkpoint: send Kamal a screenshot or text confirmation showing the exact feature branch if you are unsure. Do not continue on the wrong branch.

## Run locally

```bash
npm run dev
```

Open the local address printed by the command. Check the full flow, refresh each route, test a narrow mobile window, keyboard navigation, and visible error/empty states.

Use the exact Local URL printed by Vite, even if the port is `5174` or another value. Stop the server with `Ctrl+C`; on Windows Command Prompt, enter `Y` if asked to terminate the batch job.

Checkpoint: capture the exact URL and at least one screenshot of the assigned route. A redirect to `/auth` or unavailable live AI may be expected without production configuration; record it rather than requesting credentials.

## Save a coherent change

```bash
git status --short
git diff
git add <only-the-files-for-this-slice>
git diff --cached
git commit -m "feat(<area>): <clear user-visible outcome>"
```

Good commits describe an outcome, for example `feat(readiness): add requirement evidence casefile`. Avoid `changes`, `final`, `fix stuff` and giant mixed commits.

GitHub Desktop equivalent: inspect every changed file and green/red diff, enter the commit summary, and choose **Commit to `<your-feature-branch>`**. Commit saves locally; **Push origin** is the separate upload step.

## Update safely when Kamal asks

Do not run the rebase command merely because you reached this section. Kamal will ask when the feature branch must be refreshed against the latest integration branch.

```bash
git fetch origin
git rebase origin/integration/sih26044-product-v0.2
npm run typecheck
npm run build
```

Resolve only conflicts you understand. Never resolve by discarding another person's work. Ask Kamal when the conflict touches shared contracts or routes.

If Kamal has not asked you to rebase, do not experiment with rebase/reset/history commands. Send the conflict evidence described in `BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`.

## Push and open a Draft PR

```bash
git push -u origin feature/<name>/<slug>-pr1
```

Base branch: `integration/sih26044-product-v0.2`. The PR description must include scope, routes, screenshots/recording, data classification, limitations, tests with actual results, manual checks, files outside ownership (ideally none), and follow-ups.

GitHub Desktop equivalent: choose **Push origin**, then **Preview Pull Request/Create Pull Request**. On GitHub, verify the arrow points from your feature branch into `integration/sih26044-product-v0.2`, select **Create draft pull request**, and do not mark it ready until the self-review checklist passes.

## Review loop

1. Teammate self-review.
2. Kamal behavior/architecture review.
3. Independent AI/code review if requested.
4. CI and required QA.
5. Teammate addresses comments with new commits; do not hide review history by force-pushing unless Kamal requests it.
6. Kamal performs final merge.

To respond to review, make the requested correction on the same feature branch, preview/test again, commit, and push. The existing Draft PR updates automatically. Reply to each review comment with what changed and the new evidence; do not open a replacement PR unless Kamal asks.

Do not merge your own PR, even if GitHub displays a green Merge button. Only Kamal merges CareerCase feature PRs. Do not merge Foundation or `main` into the feature branch. Rebase onto integration only when Kamal asks.
