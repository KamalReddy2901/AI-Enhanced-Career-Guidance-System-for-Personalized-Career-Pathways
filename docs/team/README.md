# CareerCase × SIH26044 Team Execution Pack

This directory converts the v1.2 ultimate plan into bounded PR1 workstreams. It does not replace the master plan or the frozen Foundation contracts.

## Authority

1. Official SIH26044 requirements and authoritative sources.
2. `CAREERCASE_SIH26044_MASTER_EXECUTION_PLAN_v1.2_ULTIMATE.md` (project source; not copied into this repository).
3. Frozen Foundation `foundation/sih26044-v0.1` at `e2e65cde4cbb524d6bb63472c0fd3b4659d95020`.
4. `docs/sih26044-foundation-architecture.md` and `docs/sih26044-teammate-boundaries.md`.
5. This execution pack.

If this pack conflicts with a higher authority, stop and raise the conflict in the PR. Do not silently reinterpret the product.

## PR1 is a checkpoint, not the final product boundary

These five PR1 assignments are only the first integration sequence. They do not remove or defer out of the ultimate architecture any valuable v1.2 capability because of a 3–4 day prototype target. The complete target continues to include production multi-actor persistence and RBAC; full student, faculty, industry and institution lifecycles; authorized policy/program analytics; accessibility, localization and low-bandwidth support; production-grade consent, security and retention; assistive AI with human control; and truthful external-system adapters. A capability absent from PR1 remains planned unless the Master Plan explicitly excludes it for strategic reasons.

## PR1 ownership

| Owner | Workstream | Primary integration dependency |
|---|---|---|
| Laya | Student Opportunity Explorer + Readiness Casefile | Frozen opportunity/readiness contracts |
| Madhu | Gap Closure + Application Preparation | Laya navigation contract; frozen consent/application contracts |
| Manvil | Evidence Ledger + Real Verifier Workflow | Frozen evidence, artifact and verification contracts |
| Harsh | Opportunity Authoring + Recruiter Applicant Workspace | Frozen opportunity, projection and application contracts |
| Nipun | Faculty Opportunity Lifecycle + Institution Action Dashboard | Frozen collaboration and analytics contracts |

Laya and Madhu are separate owners. Neither person owns the other person's screens or behavior.

Platform note: Laya uses macOS. Her `03_BEGINNER_IMPLEMENTATION_GUIDE.md` contains the controlling macOS environment instructions and replaces the Windows-only preflight in the shared Git guide. The shared branch, commit, Draft PR, review and no-self-merge rules still apply.

## Required reading order

1. All files in `docs/team/shared/`.
2. All three files in your named directory.
3. `docs/sih26044-foundation-architecture.md`.
4. `docs/sih26044-teammate-boundaries.md`.
5. The current domain types, engine, service and demo files named in your task plan.

Do not begin implementation before completing the AI workflow and environment checkpoint in the shared pack.

## Integration order

All five PRs may be developed in parallel. Merge in this order after shared-contract review:

1. Manvil — evidence and verifier surfaces establish evidence-status UI conventions.
2. Harsh — authoring and recruiter workspace establish opportunity/application presentation.
3. Laya — explorer and readiness casefile consume the stable opportunity/evidence vocabulary.
4. Madhu — gap closure and application preparation connect readiness to consented application.
5. Nipun — faculty and institution surfaces consume the broadest set of collaboration/outcome signals.

This is a conflict-reduction order, not a product-importance ranking. A later PR may be reviewed early but must rebase onto the latest integration branch before final approval.
