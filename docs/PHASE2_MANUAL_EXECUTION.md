# Phase-2 Demo Ecosystem Seeding - Manual Execution Required

PR #82 merged ✅  
https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/pull/82

## Context

Phase-1 foundation (PR #81) created:
- 5 organizations
- 7 organization memberships  
- 10 student evidence records

**Phase-2** creates the **flagship opportunity** and requirements needed for BrowserOS production demo.

## Production Execution Steps

### 1. Apply Phase-2 Migration

Open Supabase SQL Editor (production project):
```
https://supabase.com/dashboard/project/mmwgnsggnllwgshipnwh/sql/new
```

Paste and execute:
```sql
SELECT sih26044.seed_controlled_demo_ecosystem_phase2();
```

Expected result (JSON):
```json
{
  "status": "success",
  "message": "Phase-2 controlled demo ecosystem seeded - flagship opportunity and requirements created",
  "opportunities_created": 1,
  "flagship_opportunity_requirements": 5
}
```

### 2. Verify Seeding

Execute verification helper:
```sql
SELECT sih26044.controlled_demo_seed_status();
```

Expected counts:
```json
{
  "organizations": 5,
  "memberships": 7,
  "student_evidence": 10,
  "flagship_opportunity": 1,
  "flagship_requirements": 5
}
```

### 3. What Was Created

**Flagship Opportunity:**
- ID: `f0442000-0000-4000-8000-000000000001`
- Title: "Clinical Research Data & Standardization Intern"
- Owner: Pravaah Health Systems (Recruiter A)
- Status: `published`
- Version: 1 (immutable snapshot)

**5 Requirements:**

| Requirement | Category | Priority | Resolution | Purpose |
|-------------|----------|----------|------------|---------|
| Python | skill | required | exact (python) | Strong evidence story |
| Data Analysis | skill | required | exact (data-analysis) | Strong evidence story |
| Research Documentation | skill | required | exact (research-documentation) | Strong evidence story |
| Data Visualization | skill | **preferred** | exact (data-visualization) | **Weak evidence story** |
| AYUSH Healthcare | skill | preferred | unresolved (null) | **UNKNOWN state story** |

### 4. Flagship Demo Stories

**Story A — Weak Evidence (Data Visualization):**
- Ananya has `e0001007` evidence: "Simple data visualizations for physics experiments"
- State: `self_confirmed`
- Source: Academic coursework
- Provenance: `self_declared`
- **Expected readiness:** Partial/weak (preferred skill, basic evidence)
- **Action:** Faculty verification request → human verification → readiness improves

**Story B — UNKNOWN ≠ UNSKILLED (AYUSH Healthcare):**
- No evidence record exists
- Requirement is `unresolved` (no canonical skill mapping)
- **Expected readiness:** UNKNOWN (no assessment basis)
- **NOT** flagged as gap
- System preserves epistemic humility

## Next Steps After Seeding

### A. BrowserOS Production Walkthrough (when available)

1. Sign in as student: `ananya@student.careercase.dev` (fixture password)
2. Navigate to Opportunities → "Clinical Research Data & Standardization Intern"
3. Verify opportunity details load
4. Initiate readiness assessment
5. Verify weak Data Visualization evidence triggers verification flow
6. Complete Faculty verification request
7. Sign in as faculty: `priya@faculty.careercase.dev`
8. Process verification request
9. Return to student view → verify readiness changed
10. Complete application with disclosure
11. Sign in as recruiter: `rajesh@employer.careercase.dev`
12. Verify application appears in pipeline
13. Perform human review action
14. Record outcome

### B. Optional: Expand Ecosystem

To create more background opportunities and populate full pipeline stages, create phase-2B migration with:
- 10+ additional opportunities (varied types, stages)
- 2+ questionnaires
- 3-5 applications at different stages
- Verification requests (historical)
- Collaborations
- Institution interventions

**DO NOT** pre-complete the flagship workflow — preserve for live demo.

### C. Cleanup After Verification

When demo ecosystem is validated and no longer needs modification:

```sql
-- Apply cleanup migration
\i supabase/migrations/20260905020000_cleanup_temp_seed_functions.sql
```

This revokes and drops:
- `seed_controlled_demo_ecosystem()`
- `seed_controlled_demo_ecosystem_phase2()`
- `controlled_demo_seed_status()`

Domain data (organizations, opportunities, evidence) remains intact.

## Technical Notes

**Security Model:**
- All seeding via SECURITY DEFINER functions (proper privilege bypass)
- Functions executable ONLY by service_role
- Idempotent (ON CONFLICT handling)
- No arbitrary input parameters (safe)

**Opportunity Versioning:**
- Opportunities use immutable snapshots via `opportunity_versions`
- Applications bind to specific `opportunity_version_id` (never current)
- Requirement resolution happens at version level
- Published version cannot be modified

**Why Manual Execution:**
- Service_role lacks direct table access (intentional hardening)
- GitHub Actions cannot write to production database
- Supabase CLI cannot auto-apply from repository
- Manual SQL paste is the intended deployment path

## Troubleshooting

**Error: "SAFETY: Phase-1 seed must be applied first"**
- Phase-1 not yet applied
- Execute phase-1 first: `SELECT sih26044.seed_controlled_demo_ecosystem();`

**Error: "permission denied for table opportunities"**
- Using wrong role (should be service_role via dashboard)
- Use Supabase SQL Editor (authenticated via dashboard), not direct psql

**Error: "duplicate key value violates unique constraint"**
- Seeding already applied (expected behavior)
- Check verification counts to confirm data exists

## Status

- [x] Phase-1 merged (PR #81)
- [x] Phase-2 merged (PR #82)
- [ ] Phase-2 manually applied to production
- [ ] Phase-2 verified
- [ ] BrowserOS production walkthrough complete
- [ ] Cleanup migration applied

Last updated: 2026-09-05T02:50:00Z
