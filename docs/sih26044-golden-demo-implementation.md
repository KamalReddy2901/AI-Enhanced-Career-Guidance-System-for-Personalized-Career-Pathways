# SIH26044 Golden Demo Implementation Plan

> **HISTORICAL CHECKPOINT — SUPERSEDED 2026-08-31.** The unchecked items,
> initial-demo non-goals and next steps below describe the pre-convergence
> prototype. Current demo claims and the deterministic five-minute/fallback
> path are defined in `docs/sih26044-demo-freeze.md`; current implementation
> and validation boundaries are in `docs/sih26044-integration-status.md`.

**Goal:** Five-minute demo showing evidence-backed opportunity readiness with verification loop

**Current Status:** All infrastructure exists; need to wire demo path and validate UX

---

## Demo Script (Target: 5 minutes)

### Act 1: Readiness Discovery (60s)
**Student perspective:**
1. Navigate to Opportunities → select "Junior Full-Stack Developer"
2. View ReadinessCasefile showing:
   - ✅ 8/10 requirements MET_STRONG
   - ⚠️ 1 requirement MET_WEAK_EVIDENCE (React skill)
   - ❓ 1 requirement UNKNOWN (Git collaboration)
   - **Band:** NEAR_READY (one weak away from READY_FOR_REVIEW)

**Implementation needs:**
- [x] ReadinessCasefile component exists
- [x] Readiness calculation engine exists  
- [ ] Demo fixture: opportunity with exact requirement pattern
- [ ] Demo fixture: student evidence with deliberate weak/unknown states
- [ ] Visual: requirement state symbols clear and distinct

### Act 2: Evidence Strengthening (90s)
**Student perspective:**
3. Click "Prove it" action on React requirement
4. Upload portfolio project artifact (PDF/ZIP/link)
5. Request verification from mentor "Prof. Kumar"
6. Mentor receives request notification
7. Mentor inspects artifact → attests contribution → closes request

**Implementation needs:**
- [x] Evidence upload infrastructure exists
- [x] Verification request schema exists
- [x] Verification RPC `complete_verification_request_decision` exists
- [ ] "Prove it" button wired to evidence upload modal
- [ ] Evidence upload modal functional
- [ ] Verification request creation functional
- [ ] Mentor verification inbox functional (VerificationPage exists)
- [ ] Mentor verification action form functional (VerificationActionForm exists)

### Act 3: Readiness Update (30s)
**Student perspective:**
8. Student refreshes opportunity view
9. React requirement now shows MET_STRONG (verification badge)
10. Band updates: NEAR_READY → READY_FOR_REVIEW
11. Application button now enabled

**Implementation needs:**
- [ ] Verification event → evidence signal update (client-side refresh pattern)
- [ ] Readiness recalculation after evidence change
- [ ] Visual: verification badge on strong evidence
- [ ] Band explanation shows why READY_FOR_REVIEW

### Act 4: Application Submission (60s)
**Student perspective:**
12. Click "Apply" → Application preparation page
13. Review disclosed evidence (shows verified React skill)
14. Grant application-review consent
15. Finalize immutable snapshot
16. Submit application

**Implementation needs:**
- [x] ApplicationPreparationPage exists
- [x] ApplicationFinalizationPanel exists
- [x] `create_application_snapshot` RPC exists
- [ ] Application submission completes without errors
- [ ] Confirmation message shown

### Act 5: Recruiter Review (60s)
**Recruiter perspective:**
17. Navigate to Applicants → view new application
18. See requirement ↔ evidence trace
19. Inspect verified React artifact
20. Manual shortlist action

**Implementation needs:**
- [x] RecruiterProductionPage exists
- [x] ApplicationDetailView exists
- [ ] Applicant pipeline view functional
- [ ] Evidence inspection modal functional
- [ ] Manual shortlist button functional

### Act 6: Institution Intervention (30s)
**Institution perspective:**
21. Navigate to Interventions dashboard
22. See cohort analytics: "Git collaboration" recurring gap
23. View intervention recommendation

**Implementation needs:**
- [x] InstitutionInterventionsPage exists
- [ ] Cohort gap analysis functional (may use mock aggregate)
- [ ] Intervention recommendation displayed

---

## Implementation Priorities

### Priority 1: Evidence Upload & Verification Request (Act 2)
**Goal:** Student can upload artifact and request verification

**Tasks:**
1. Wire "Prove it" button in ReadinessCasefile to modal
2. Create `EvidenceUploadModal` component
3. Implement artifact upload to Supabase Storage
4. Implement verification request creation
5. Test: student can upload artifact and create verification request

**Files to modify:**
- `src/app/components/sih/student/readiness/ReadinessCasefile.tsx`
- `src/app/components/sih/student/evidence/EvidenceUploadModal.tsx` (new)
- `src/app/services/sih/browserDal.ts` (add upload/request methods)

### Priority 2: Mentor Verification Flow (Act 2)
**Goal:** Mentor can review and attest

**Tasks:**
1. Validate VerificationPage inbox loads requests
2. Validate VerificationRequestDetail shows artifact
3. Validate VerificationActionForm calls `complete_verification_request_decision` RPC
4. Test: mentor can complete verification decision

**Files to check:**
- `src/app/pages/VerificationPage.tsx`
- `src/app/components/sih/verification/VerificationRequestInbox.tsx`
- `src/app/components/sih/verification/VerificationRequestDetail.tsx`
- `src/app/components/sih/verification/VerificationActionForm.tsx`

### Priority 3: Readiness Recalculation (Act 3)
**Goal:** Verified evidence updates readiness

**Implementation options:**
1. **Client-side refresh:** Student manually refreshes → client recalculates with updated evidence signals
2. **Polling:** Client polls for evidence changes every N seconds
3. **Server-side trigger:** Database trigger creates new readiness result row (requires Worker endpoint)
4. **Real-time subscription:** Supabase realtime on verification_events table

**Recommended for demo:** Option 1 (manual refresh) with clear UI affordance
- Add "Refresh readiness" button
- Show last-updated timestamp
- Client-side recalculation using existing `computeOpportunityReadiness` engine

**Tasks:**
1. Add refresh mechanism to opportunity detail page
2. Fetch updated evidence signals including verification state
3. Recalculate readiness client-side
4. Update UI with new band/requirement states

### Priority 4: Application Submission Validation (Act 4)
**Goal:** Student can submit application end-to-end

**Tasks:**
1. Test ApplicationPreparationPage loads evidence
2. Test ApplicationFinalizationPanel creates snapshot
3. Test snapshot submission succeeds
4. Add confirmation UI

### Priority 5: Recruiter Pipeline (Act 5)
**Goal:** Recruiter can view and shortlist

**Tasks:**
1. Validate recruiter can list applications
2. Validate ApplicationDetailView shows evidence
3. Add manual shortlist action
4. Test shortlist updates application stage

### Priority 6: Institution View (Act 6)
**Goal:** Show intervention recommendation

**Tasks:**
1. Create mock cohort gap aggregate
2. Display in InstitutionInterventionsPage
3. Show intervention recommendation based on gap

---

## Demo Fixtures Required

### 1. Organizations
- **Student org:** "JNTU-H College of Engineering"
- **Industry org:** "TechCorp Solutions" (owns opportunity)
- **Mentor org:** Same as student (faculty member)

### 2. Actors
- **Student:** Priya Sharma (actor_id: `demo-student-001`)
- **Mentor:** Prof. Kumar (actor_id: `demo-mentor-001`)
- **Recruiter:** Amit Patel (actor_id: `demo-recruiter-001`)
- **Institution Admin:** Dr. Reddy (actor_id: `demo-admin-001`)

### 3. Opportunity
- **Title:** Junior Full-Stack Developer
- **Owner:** TechCorp Solutions
- **Requirements (10 total):**
  - JavaScript (required, MET_STRONG)
  - HTML/CSS (required, MET_STRONG)
  - React (required, MET_WEAK_EVIDENCE) ← **TARGET FOR DEMO**
  - Node.js (required, MET_STRONG)
  - SQL (required, MET_STRONG)
  - Git basics (required, MET_STRONG)
  - Git collaboration (required, UNKNOWN) ← **RECURRING GAP**
  - REST APIs (required, MET_STRONG)
  - Problem solving (preferred, MET_STRONG)
  - Communication (preferred, MET_STRONG)

### 4. Student Evidence
- 8 evidence records with MET_STRONG provenance (various skills)
- 1 evidence record: React skill, `self_declared`, `unverified` → MET_WEAK_EVIDENCE
- 0 evidence for Git collaboration → UNKNOWN

### 5. Verification Artifacts
- Portfolio project: `priya-react-portfolio.pdf` (pre-uploaded to demo bucket)
- Will be linked to React evidence during demo

---

## Success Criteria

**Demo is successful if:**
1. ✅ Student sees NEAR_READY band initially
2. ✅ Student can upload artifact and request verification
3. ✅ Mentor receives request and can attest
4. ✅ Readiness updates to READY_FOR_REVIEW after verification
5. ✅ Student can submit application with verified evidence
6. ✅ Recruiter sees application with evidence trace
7. ✅ Recruiter can manually shortlist
8. ✅ Institution sees Git collaboration gap in cohort

**Demo works offline:** All fixtures pre-loaded, no external API calls required

---

## Non-Goals for Initial Demo

- ❌ Real-time readiness updates (manual refresh acceptable)
- ❌ Automatic intervention recommendations (one hardcoded example acceptable)
- ❌ Email/SMS notifications (UI-only flow acceptable)
- ❌ External integrations (NCS, DigiLocker, etc.)
- ❌ Multi-step application stages (one shortlist action sufficient)
- ❌ Outcome tracking (submission → shortlist is sufficient)

---

## Next Steps

1. **Immediate:** Implement Priority 1 (Evidence Upload & Verification Request)
2. **Then:** Validate Priority 2 (Mentor Verification Flow)
3. **Then:** Implement Priority 3 (Readiness Recalculation)
4. **Then:** Validate Priorities 4-6
5. **Finally:** Create demo fixtures SQL script

**Estimated completion:** 3-4 PRs, each focused on one demo act
