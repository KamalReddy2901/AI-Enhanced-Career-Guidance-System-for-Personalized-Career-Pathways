# Beginner Git, Commit, PR and Review Guide

## One-time setup

```bash
git clone https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways.git
cd AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways
npm ci
```

Never paste secrets into terminal history, source files, screenshots or PRs.

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

## Run locally

```bash
npm run dev
```

Open the local address printed by the command. Check the full flow, refresh each route, test a narrow mobile window, keyboard navigation, and visible error/empty states.

## Save a coherent change

```bash
git status --short
git diff
git add <only-the-files-for-this-slice>
git diff --cached
git commit -m "feat(<area>): <clear user-visible outcome>"
```

Good commits describe an outcome, for example `feat(readiness): add requirement evidence casefile`. Avoid `changes`, `final`, `fix stuff` and giant mixed commits.

## Update safely before review

```bash
git fetch origin
git rebase origin/integration/sih26044-product-v0.2
npm run typecheck
npm run build
```

Resolve only conflicts you understand. Never resolve by discarding another person's work. Ask Kamal when the conflict touches shared contracts or routes.

## Push and open a Draft PR

```bash
git push -u origin feature/<name>/<slug>-pr1
```

Base branch: `integration/sih26044-product-v0.2`. The PR description must include scope, routes, screenshots/recording, data classification, limitations, tests with actual results, manual checks, files outside ownership (ideally none), and follow-ups.

## Review loop

1. Teammate self-review.
2. Kamal behavior/architecture review.
3. Independent AI/code review if requested.
4. CI and required QA.
5. Teammate addresses comments with new commits; do not hide review history by force-pushing unless Kamal requests it.
6. Kamal performs final merge.

Do not merge your own PR. Do not merge Foundation or `main` into the feature branch. Rebase onto integration when asked.
