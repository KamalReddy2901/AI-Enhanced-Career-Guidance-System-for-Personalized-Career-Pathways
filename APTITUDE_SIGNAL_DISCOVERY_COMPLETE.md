# Aptitude Signal Discovery - Implementation Complete

**Status:** ✅ All 5 stages complete, zero TypeScript errors, build successful

**Date:** 2026-08-15

---

## Overview

Implemented **Aptitude Signal Discovery**, an AI-driven aptitude evidence gathering feature that aligns CareerCase with SIH260480's literal ask for "AI-driven tools to assess an individual's natural aptitudes." The AI extracts evidence (not scores) from conversational examples, and a pure deterministic function computes a small, capped adjustment.

## Core Philosophy Maintained

✅ **The AI never outputs a final 0-100 aptitude score**  
✅ **All score arithmetic happens in pure, deterministic functions**  
✅ **Baseline screener result is preserved separately for auditability**  
✅ **Every adjustment is capped (≤6 points per dimension) and disclosed**

---

## Files Created

### 1. `/src/app/components/guidance/AptitudeSignalDiscovery.tsx` (393 lines)
- 4-5 turn conversational interview covering numerical/verbal/logical/spatial dimensions
- Modal dialog matching SkillDiscoveryChat design pattern
- Transparent evidence disclosure screen showing:
  - Each evidence item (dimension, rationale, strength)
  - Capped adjustments per dimension (baseline → adjusted scores)
- i18n support: English, Hindi, Telugu
- Design system compliance: `card-sketch`, CSS variables, no dark mode classes
- Accessibility: `aria-live="polite"`, `aria-label`, focus management

---

## Files Modified

### 2. `/src/app/engine/aptitude.ts`
**Added:**
- `AptitudeEvidenceItem` interface (dimension, rationale, strength 0-1)
- `computeAptitudeEvidenceAdjustment()` - pure function, CAP=6, mirrors momentum boost discipline
- `applyAptitudeAdjustment()` - combines baseline + adjustment, clamped to 100

**Export added to types:**
```typescript
export type { AptitudeEvidenceItem } from './aptitude';
```

### 3. `/src/app/engine/types.ts`
**Extended CareerPassport interface:**
- `aptitudeBaseline?: AptitudeScores` - preserves deterministic screener result
- `aptitudeEvidence?: Array<{ dimension, rationale, strength }>` - AI-extracted evidence

### 4. `/src/app/services/ai.ts`
**Added:**
- `extractAptitudeEvidence(conversationText, language)` function
- Defensive JSON parsing with validation
- Evidence items with clamped strength (0-1)
- Pattern follows `extractProfileFromResume` and `SkillDiscoveryChat` extraction
- Uses `withRetry` + `callGroq` + `jsonMode: true`

**Usage type:** `'aptitude-signal-discovery'`

### 5. `/worker/src/models.ts`
**Registered:**
```typescript
'aptitude-signal-discovery': 'premium'  // conversational aptitude evidence extraction
```

### 6. `/src/app/engine/matching.ts`
**Updated aptitudeScore function:**
- Now returns `[score, hasData, adjustment]` (3-tuple)
- Computes adjusted scores if evidence exists
- Preserves baseline for auditability

**Updated scoreOccupation function:**
- Captures `aptitudeAdjustment` from 3-tuple
- Aptitude component disclosure:
  - Shows adjustment in note when applied
  - Updates sourceDetail to indicate evidence count
  - Format: `"+X-point average adjustment from conversational evidence (capped at +6 per dimension)"`

### 7. `/src/app/pages/AssessAptitudePage.tsx`
**Added:**
- State: `showDiscovery`, handler: `handleEvidenceDiscovered`
- Optional CTA button after interpretation card: "Sharpen this with a quick conversation"
- i18n: English, Hindi, Telugu
- AptitudeSignalDiscovery dialog integration
- Updates passport with baseline + evidence on completion

### 8. `/PROJECT_BRIEF.md`
**Documented in 3 sections:**

**Assessments section:**
- Added bullet describing optional Aptitude Signal Discovery
- Documented evidence extraction → deterministic adjustment pipeline

**Deterministic recommendation engine section:**
- New paragraph after learning-feasibility adjustment
- Explains aptitude-fit component adjustment mechanism
- Emphasizes baseline preservation and disclosure

**AI-assisted exploration section:**
- Added Aptitude Signal Discovery to bulleted list
- Positioned after skill discovery, before trajectory projection

---

## Evidence → Adjustment Pipeline

```typescript
User completes 4-5 turn interview about problem-solving approach
  ↓
AI extracts evidence items:
  { dimension: 'numerical', rationale: "...", strength: 0.8 }
  { dimension: 'logical', rationale: "...", strength: 0.6 }
  ↓
Pure deterministic function (computeAptitudeEvidenceAdjustment):
  - Each item contributes: strength * 4 points
  - Sum per dimension, capped at 6
  ↓
applyAptitudeAdjustment(baseline, adjustment):
  - baseline preserved in passport.aptitudeBaseline
  - adjusted = clamp(baseline + adjustment, 0, 100)
  ↓
Recommendation engine disclosure:
  - Component note: "+X-point average adjustment from conversational evidence"
  - Source detail: "V7 screener baseline + N evidence items from Aptitude Signal Discovery"
```

---

## Disclosure Examples

**When adjustment applied:**
- Note: `weighted against this role's numerical, verbal, logical and spatial demands, with a +4-point average adjustment from conversational evidence (capped at +6 per dimension)`
- Source detail: `V7 screener baseline + 3 evidence items from Aptitude Signal Discovery`

**When no adjustment:**
- Note: `weighted against this role's numerical, verbal, logical and spatial demands`
- Source detail: `V7`

---

## Verification Results

### TypeScript
```bash
npm run typecheck
✅ Exit 0, no errors
```

### Build
```bash
npm run build
✅ Exit 0, built in 4.71s
✅ Final size: 4538.36 KiB (102 precache entries)
```

### Knowledge Base Validation
(Previous validation still valid, no KB changes)

---

## Design System Compliance

✅ **Colors:** `var(--accent-news)`, `var(--ink)`, `var(--paper)`, `var(--paper-raised)`  
✅ **Borders:** `card-sketch` (4px 4px 0 var(--ink))  
✅ **Typography:** `font-display` for headings, `font-mono-ui` for labels  
✅ **No purple/pink/blue gradients**  
✅ **No dark mode classes**  
✅ **No rounded-xl except user message bubbles (rounded-2xl rounded-br-sm)**

---

## Entry Points

### Primary
**AssessAptitudePage results screen:**
- Optional CTA button after AI interpretation card
- "Sharpen this with a quick conversation"
- Opens modal dialog
- Multilingual (en/hi/te)

### Secondary (Nice-to-have, not yet implemented)
- PassportPage aptitude section could have similar entry point
- Allows users to revisit discovery later

---

## i18n Coverage

**Languages:** English, Hindi, Telugu

**Translated strings:**
- Interview questions (5 questions × 3 languages)
- UI labels: title, subtitle, placeholder, send, processing, complete
- Button labels: "Add to Profile", "Start Over"
- Dimension labels: numerical, verbal, logical, spatial
- Status messages: evidence found, adjustments

---

## Storage

**Passport fields:**
- `aptitude` - current scores (baseline or adjusted)
- `aptitudeBaseline` - immutable screener result
- `aptitudeEvidence` - array of evidence items

**No separate localStorage keys** - stored within passport in Supabase + local storage

---

## Alignment with Problem Statement

**SIH260480 asks for:** "AI-driven tools to assess an individual's natural aptitudes and strengths"

**Before:** AI only narrated already-computed scores (zero signal contribution)

**After:** AI extracts evidence from conversational examples, feeds deterministic adjustment pipeline

**Guardrails maintained:**
- AI never outputs final scores
- Pure functions do all arithmetic
- Baseline preserved for auditability
- All adjustments capped and disclosed
- Deterministic guarantee intact (same input → same output)

---

## Next Steps (Optional)

1. **Add PassportPage entry point** - Allow users to revisit discovery from passport
2. **User testing** - Validate conversation flow and evidence quality
3. **Psychometric validation** - Validate adjustment correlation with fuller assessments
4. **Analytics** - Track discovery completion rate and evidence item distribution

---

## Technical Debt / Known Limitations

- Entry point only on results screen (not yet on PassportPage)
- No retry mechanism if AI extraction fails (gracefully returns empty array)
- Adjustment is per-dimension average (could be weighted by occupation profile)
- Evidence rationale length capped at 300 chars (defensive truncation)

---

## Files Requiring Commit

```bash
src/app/components/guidance/AptitudeSignalDiscovery.tsx  # New file (393 lines)
src/app/engine/aptitude.ts                              # Modified (60 lines added)
src/app/engine/types.ts                                 # Modified (11 lines added)
src/app/engine/matching.ts                              # Modified (imports + aptitudeScore + component)
src/app/services/ai.ts                                  # Modified (102 lines added)
src/app/pages/AssessAptitudePage.tsx                    # Modified (imports + state + CTA + dialog)
worker/src/models.ts                                    # Modified (1 line added)
PROJECT_BRIEF.md                                        # Modified (documentation)
```

---

## Summary

✅ **All 5 stages complete**  
✅ **Zero TypeScript errors**  
✅ **Build successful (4.71s)**  
✅ **Design system compliant**  
✅ **Fully documented**  
✅ **Deterministic philosophy maintained**  
✅ **Disclosure transparent**  
✅ **Ready for commit and testing**

The Aptitude Signal Discovery feature is complete, production-ready, and maintains CareerCase's core technical differentiator: **the AI contributes evidence, not scores**.
