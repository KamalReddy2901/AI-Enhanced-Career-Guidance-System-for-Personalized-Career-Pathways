# Auto-Add Custom Skills Feature

## Problem Statement
The AI resume extraction was identifying skills from resumes (Node.js, MongoDB, Express.js, Redux, Bootstrap, Tailwind CSS, Docker, VS Code, Postman, Slack, etc.) but they weren't matching the 178-skill knowledge base. Users had to manually add each unmatched skill one by one, creating friction in the onboarding flow.

## Solution Overview
Implemented automatic addition of unmatched skills as **custom skills** that:
1. Are automatically added to the Career Passport during resume extraction
2. Participate in recommendation scoring via fuzzy matching
3. Maintain full evidence and confidence tracking
4. Are clearly marked as custom skills in the UI

## Technical Implementation

### 1. Updated `matchSkillsToKB()` - `src/app/engine/skillProfile.ts`
**Before:** Returned unmatched skills in a separate array for manual addition  
**After:** Automatically creates `SkillClaim` objects for unmatched skills using the `name` field

```typescript
const makeCustomClaim = (ex: ExtractedSkill, confidence: number): SkillClaim => ({
  skillId: undefined!,  // No KB match
  name: ex.name,        // Preserve original extracted name
  proficiency: ex.proficiency,
  confidence,           // 0.6 confidence for custom skills
  evidence: [{
    type: 'inferred_from_resume',
    description: ex.evidence,
    confidence,
    observedAt: new Date().toISOString(),
  }],
});
```

**Confidence levels:**
- Exact KB match: 0.72
- Partial KB match (4+ char token overlap): 0.5
- Custom skill (no KB match): 0.6

### 2. Enhanced `skillScore()` - `src/app/engine/matching.ts`
**Before:** Only matched skills with exact `skillId` from knowledge base  
**After:** Implements fuzzy matching for custom skills

**Matching Strategy:**
1. **Exact KB match** (skillId exists) → 1.0 match confidence
2. **Exact name match** (custom skill name == KB skill alias) → 0.8 match confidence
3. **Partial token match** (4+ char token overlap) → 0.6 match confidence

**Scoring Formula:**
```
coverage = Σ (min(current, required) / required) × evidenceConfidence × matchConfidence × importance
```

Where:
- `evidenceConfidence`: How confident we are in the skill claim (0.6 for custom, 0.72 for AI-extracted KB)
- `matchConfidence`: How confident we are in the fuzzy match (0.6-1.0)
- `importance`: How important this skill is for the occupation

### 3. Updated UI - `src/app/pages/PassportPage.tsx`
**Before:** Showed unmatched skills as clickable buttons requiring manual addition  
**After:** Shows confirmation that custom skills were auto-added with explanation

**New Message:**
```
✓ {count} custom skills added

These skills from your resume were automatically added as custom skills 
(they're not in our core 178-skill knowledge base, but will still be used 
in recommendations via fuzzy matching):

[skill chips displayed with checkmarks]

Custom skills are matched against occupation requirements using AI-assisted 
fuzzy matching and contribute to your skill coverage score.
```

## Architecture Consistency

This implementation aligns with CareerCase's **evidence-based philosophy**:

✅ **178-skill KB remains canonical** for occupation requirements  
✅ **Career Passport accepts any skill** from real evidence  
✅ **Deterministic scoring** maintained (fuzzy matching is rule-based, not AI)  
✅ **Transparent confidence** tracked at every level  
✅ **Evidence preserved** with source and timestamp  

## Example Flow

**Resume contains:** "Node.js, MongoDB, Express.js, Redux, Bootstrap, Tailwind CSS"

**KB has:** "JavaScript" (with aliases: js, node, nodejs), "React", "Web Development"

**Result:**
1. "Node.js" → partial match with "JavaScript" via alias "node" → 0.8 match confidence
2. "MongoDB" → no KB match → added as custom skill (0.6 confidence)
3. "Express.js" → no KB match → added as custom skill (0.6 confidence)
4. "Redux" → no KB match → added as custom skill (0.6 confidence)
5. "Bootstrap" → no KB match → added as custom skill (0.6 confidence)
6. "Tailwind CSS" → no KB match → added as custom skill (0.6 confidence)

**In Recommendation Scoring:**
- If an occupation requires "JavaScript" → Node.js custom skill matches via token overlap → contributes to coverage
- If an occupation requires "Web Development" → All custom skills checked for relevance via fuzzy matching
- Custom skills still count toward completeness and evidence accumulation

## Benefits

1. **Zero-friction onboarding**: Resume upload → instant skill addition
2. **Better skill coverage**: Tools like Docker, Postman, VS Code now contribute to scores
3. **Evidence-based**: All auto-added skills have resume evidence with quotes
4. **Transparent**: Users see exactly which skills were added and how they work
5. **Future-proof**: New technologies not yet in KB are automatically captured

## Testing Checklist

- [x] TypeScript compilation passes
- [x] Production build succeeds
- [ ] Test resume extraction with sample resume (Priya Sharma)
- [ ] Verify custom skills appear in Career Passport
- [ ] Verify custom skills contribute to recommendation scores
- [ ] Verify UI shows auto-add confirmation message
- [ ] Test fuzzy matching with variations (Node.js vs nodejs vs Node)

## Future Enhancements

1. **ML-based similarity**: Use embedding-based similarity for better custom skill matching
2. **Skill suggestion**: Suggest KB skills when custom skill is very similar
3. **Bulk KB expansion**: Periodically promote frequently-extracted custom skills to KB
4. **User feedback loop**: Let users confirm/reject fuzzy matches to improve confidence
5. **Custom skill analytics**: Track which custom skills are most common for KB expansion

---

**Status:** ✅ Implemented, built, and ready for testing  
**Date:** August 17, 2026  
**Commit Required:** Yes (3 files changed)
