# SIH26044 Accessibility Audit & Roadmap

> **HISTORICAL BASELINE — SUPERSEDED 2026-08-31.** The findings below are a
> pre-convergence audit. Current implemented foundations, automated static
> checks and the remaining browser/manual validation gate are recorded in
> `docs/sih26044-integration-status.md` and
> `docs/sih26044-browser-e2e-status.md`. This file does not claim WCAG
> conformance.

**Target:** WCAG 2.2 Level AA Compliance  
**Last Updated:** 2026-08-31  
**Status:** Foundation phase complete, progressive enhancement in progress

---

## Executive Summary

CareerCase SIH26044 aims for **WCAG 2.2 Level AA** compliance across all student, recruiter, mentor, faculty, and institution journeys. This document tracks:

1. Current accessibility status
2. WCAG conformance gaps
3. Implementation priorities
4. Testing procedures
5. Continuous improvement plan

**Current Status:**
- ✅ Semantic HTML structure throughout
- ✅ Keyboard navigation for core flows
- ✅ ARIA labels on interactive components
- ⚠️ Color contrast needs improvement
- ⚠️ Form validation messaging incomplete
- ⚠️ Screen reader optimization needed
- ⚠️ Responsive/mobile UX needs enhancement

---

## WCAG 2.2 Level AA Conformance Status

### Principle 1: Perceivable

#### 1.1 Text Alternatives (A)
- **1.1.1 Non-text Content:** ⚠️ PARTIAL
  - ✅ Decorative images have empty alt text
  - ⚠️ Functional icons need accessible names
  - Action: Add aria-label to icon-only buttons

#### 1.2 Time-based Media (A)
- **Not applicable:** No video/audio content currently

#### 1.3 Adaptable (A/AA)
- **1.3.1 Info and Relationships:** ✅ PASS
  - Semantic HTML throughout (headings, lists, forms)
  - Proper heading hierarchy
- **1.3.2 Meaningful Sequence:** ✅ PASS
  - Logical DOM order matches visual order
- **1.3.3 Sensory Characteristics:** ✅ PASS
  - Instructions don't rely solely on shape/color/position
- **1.3.4 Orientation (AA):** ✅ PASS
  - Content works in both portrait and landscape
- **1.3.5 Identify Input Purpose (AA):** ⚠️ PARTIAL
  - ✅ Email inputs have autocomplete="email"
  - ⚠️ Need autocomplete on more form fields
  - Action: Add autocomplete attributes systematically

#### 1.4 Distinguishable (A/AA)
- **1.4.1 Use of Color:** ✅ PASS
  - State changes don't rely on color alone
  - Border/icon indicators supplement color
- **1.4.2 Audio Control:** ✅ PASS (no auto-playing audio)
- **1.4.3 Contrast (Minimum) (AA):** ⚠️ PARTIAL
  - ✅ Most text meets 4.5:1 ratio
  - ⚠️ `text-black/65` and `text-black/45` may fail
  - Action: Audit and fix low-contrast text
- **1.4.4 Resize Text:** ✅ PASS
  - Text resizes to 200% without loss of content
- **1.4.5 Images of Text:** ✅ PASS
  - No images of text except logo
- **1.4.10 Reflow (AA):** ⚠️ NEEDS TESTING
  - Mobile responsive but needs validation at 320px width
- **1.4.11 Non-text Contrast (AA):** ⚠️ PARTIAL
  - ✅ Buttons have 3:1 contrast
  - ⚠️ Some borders may be too subtle
  - Action: Audit component borders
- **1.4.12 Text Spacing (AA):** ✅ PASS
  - No fixed line-height that breaks with increased spacing
- **1.4.13 Content on Hover or Focus (AA):** ✅ PASS
  - Tooltips dismissible and persistent

### Principle 2: Operable

#### 2.1 Keyboard Accessible (A)
- **2.1.1 Keyboard:** ⚠️ PARTIAL
  - ✅ All navigation links keyboard accessible
  - ✅ Form inputs keyboard accessible
  - ⚠️ Modal close needs keyboard support
  - ⚠️ Dropdown menus need keyboard navigation
  - Action: Add keyboard handlers to modals and dropdowns
- **2.1.2 No Keyboard Trap:** ✅ PASS
  - Focus can move away from all components
- **2.1.4 Character Key Shortcuts (A):** ✅ PASS (no single-key shortcuts)

#### 2.2 Enough Time (A)
- **2.2.1 Timing Adjustable:** ✅ PASS
  - No time limits on user actions
  - Supabase session timeout is generous (1 hour)
- **2.2.2 Pause, Stop, Hide:** ✅ PASS (no auto-updating content)

#### 2.3 Seizures (A/AAA)
- **2.3.1 Three Flashes or Below Threshold:** ✅ PASS
  - No flashing content

#### 2.4 Navigable (A/AA)
- **2.4.1 Bypass Blocks (A):** ⚠️ MISSING
  - ❌ No skip navigation link
  - Action: Add "Skip to main content" link
- **2.4.2 Page Titled (A):** ⚠️ PARTIAL
  - ✅ React Router sets page titles
  - ⚠️ Some dynamic pages may have generic titles
  - Action: Audit and fix page titles
- **2.4.3 Focus Order (A):** ✅ PASS
  - Focus order follows visual order
- **2.4.4 Link Purpose (A):** ✅ PASS
  - Link text describes destination
- **2.4.5 Multiple Ways (AA):** ⚠️ PARTIAL
  - ✅ Navigation menu provides site structure
  - ⚠️ No site search currently
  - Action: Add search for opportunities/evidence
- **2.4.6 Headings and Labels (AA):** ✅ PASS
  - Descriptive headings and labels throughout
- **2.4.7 Focus Visible (AA):** ⚠️ PARTIAL
  - ✅ Most interactive elements show focus
  - ⚠️ Some custom components may not
  - Action: Ensure focus-visible styles on all interactive elements

#### 2.5 Input Modalities (A/AA)
- **2.5.1 Pointer Gestures (A):** ✅ PASS (no complex gestures)
- **2.5.2 Pointer Cancellation (A):** ✅ PASS (click on up event)
- **2.5.3 Label in Name (A):** ✅ PASS
  - Visible labels match accessible names
- **2.5.4 Motion Actuation (A):** ✅ PASS (no motion-based input)

### Principle 3: Understandable

#### 3.1 Readable (A/AA)
- **3.1.1 Language of Page (A):** ✅ PASS
  - `<html lang="en">` set
- **3.1.2 Language of Parts (AA):** ✅ PASS (single language)

#### 3.2 Predictable (A/AA)
- **3.2.1 On Focus (A):** ✅ PASS
  - Focus doesn't trigger context changes
- **3.2.2 On Input (A):** ✅ PASS
  - Input doesn't trigger unexpected changes
- **3.2.3 Consistent Navigation (AA):** ✅ PASS
  - Navigation consistent across pages
- **3.2.4 Consistent Identification (AA):** ✅ PASS
  - Components with same function identified consistently

#### 3.3 Input Assistance (A/AA)
- **3.3.1 Error Identification (A):** ⚠️ PARTIAL
  - ✅ Validation errors shown
  - ⚠️ Not all errors have accessible descriptions
  - Action: Add aria-describedby to error messages
- **3.3.2 Labels or Instructions (A):** ✅ PASS
  - All form fields have labels
- **3.3.3 Error Suggestion (AA):** ⚠️ PARTIAL
  - ✅ Some forms suggest fixes
  - ⚠️ Needs comprehensive coverage
  - Action: Add specific error guidance
- **3.3.4 Error Prevention (AA):** ⚠️ PARTIAL
  - ✅ Application submission has confirmation
  - ⚠️ Evidence deletion lacks confirmation
  - Action: Add confirmation dialogs for destructive actions

### Principle 4: Robust

#### 4.1 Compatible (A/AA)
- **4.1.1 Parsing (A):** ✅ PASS
  - Valid HTML structure
- **4.1.2 Name, Role, Value (A):** ⚠️ PARTIAL
  - ✅ Standard HTML controls have proper semantics
  - ⚠️ Custom components need ARIA
  - Action: Add ARIA to custom dropdowns, modals, tabs
- **4.1.3 Status Messages (AA):** ⚠️ PARTIAL
  - ✅ Success messages shown
  - ⚠️ Not announced to screen readers
  - Action: Add aria-live regions

---

## Implementation Priorities

### Priority 1: Critical Barriers (Immediate)
**Blocks basic functionality for assistive technology users**

1. **Skip Navigation Link**
   - Add "Skip to main content" link at page top
   - Hidden visually, keyboard/SR accessible

2. **Keyboard Modal/Dropdown Support**
   - ESC to close modals
   - Arrow keys for dropdown navigation
   - Tab trapping in modals

3. **ARIA Labels on Icon Buttons**
   - Add accessible names to all icon-only buttons
   - "Close", "Delete", "Edit", etc.

4. **Error Message Association**
   - Link error messages to form fields via aria-describedby
   - Announce errors to screen readers

### Priority 2: Enhanced Usability (High)
**Improves experience significantly**

5. **Color Contrast Fixes**
   - Audit all text colors against backgrounds
   - Replace low-contrast colors (black/65, black/45)
   - Ensure 4.5:1 ratio for normal text, 3:1 for large

6. **Focus Visible Styles**
   - Consistent focus indicator (outline or ring)
   - Sufficient contrast (3:1 minimum)
   - Visible on all interactive elements

7. **Form Autocomplete**
   - Add autocomplete attributes to all form fields
   - Name, email, address, phone, etc.

8. **Status Announcements**
   - Add aria-live regions for dynamic updates
   - "Application submitted", "Evidence uploaded", etc.

### Priority 3: Polish & Optimization (Medium)
**Enhances overall experience**

9. **Page Titles**
   - Audit all routes for descriptive titles
   - Format: "Page Name - CareerCase"

10. **Confirmation Dialogs**
    - Add confirmation for all destructive actions
    - Clear action buttons ("Delete Evidence", not "OK")

11. **Search Functionality**
    - Add opportunity search
    - Add evidence search
    - Keyboard shortcut to focus search (/)

12. **Responsive Enhancement**
    - Test at 320px width (small mobile)
    - Optimize touch targets (44x44px minimum)
    - Improve mobile navigation

---

## Testing Procedures

### Automated Testing
**Tools:** axe-core, WAVE, Lighthouse

```bash
# Add axe-core to test suite
npm install --save-dev @axe-core/react
npm install --save-dev jest-axe

# Run accessibility tests
npm run test:a11y
```

**Action Items:**
- Integrate axe-core into CI
- Add accessibility assertions to component tests
- Run Lighthouse in CI for every PR

### Manual Testing

#### Keyboard Navigation Test
1. Unplug mouse
2. Navigate entire application using only keyboard
3. Ensure all functionality accessible via Tab, Enter, Arrow keys

#### Screen Reader Test
**macOS:** VoiceOver (Cmd+F5)
**Windows:** NVDA (free) or JAWS

Test flows:
- Sign in
- View opportunity → readiness → apply
- Upload evidence → request verification
- Recruiter: review application → shortlist

#### Color Contrast Test
**Tool:** WebAIM Contrast Checker, browser DevTools

1. Extract all text/background color combinations
2. Test against WCAG AA ratios
3. Document failures and fixes

#### Zoom/Text Resize Test
1. Zoom to 200% (browser zoom)
2. Verify no content loss or overlap
3. Test with browser text-only zoom

#### Mobile/Touch Test
1. Test on actual mobile devices (iOS/Android)
2. Verify touch targets ≥ 44x44px
3. Test landscape and portrait orientations

### Continuous Monitoring
- Add accessibility regression tests to CI
- Monthly manual screen reader audits
- User feedback channels for accessibility issues

---

## Current Implementation Status

| WCAG Criterion | Level | Status | Priority |
|---|---|---|---|
| Skip navigation | A | ❌ Missing | P1 |
| Keyboard modal support | A | ❌ Missing | P1 |
| Icon button labels | A | ⚠️ Partial | P1 |
| Error association | A | ⚠️ Partial | P1 |
| Color contrast | AA | ⚠️ Partial | P2 |
| Focus visible | AA | ⚠️ Partial | P2 |
| Form autocomplete | AA | ⚠️ Partial | P2 |
| Status announcements | AA | ⚠️ Partial | P2 |
| Page titles | A | ⚠️ Partial | P3 |
| Confirmation dialogs | AA | ⚠️ Partial | P3 |
| Search functionality | AA | ❌ Missing | P3 |
| Responsive optimization | AA | ⚠️ Partial | P3 |

---

## Roadmap

### Phase 1: Foundation (Current)
**Goal:** Remove critical barriers
- ✅ Add skip navigation
- ✅ Fix keyboard modal/dropdown support
- ✅ Add ARIA labels to icon buttons
- ✅ Associate error messages

**Deliverable:** Priority 1 items complete

### Phase 2: Enhanced Usability
**Goal:** Improve screen reader and keyboard experience
- Fix color contrast issues
- Ensure focus visible everywhere
- Add form autocomplete
- Implement status announcements

**Deliverable:** Priority 2 items complete

### Phase 3: Polish
**Goal:** Optimize overall accessibility
- Audit and fix page titles
- Add confirmation dialogs
- Implement search
- Optimize responsive/mobile

**Deliverable:** Priority 3 items complete

### Phase 4: Validation
**Goal:** Formal WCAG 2.2 AA conformance
- Automated test coverage ≥ 80%
- Full manual screen reader test
- Third-party accessibility audit
- User testing with people with disabilities

**Deliverable:** WCAG 2.2 AA conformance report

---

## Known Issues & Workarounds

### Issue: Tailwind's Default Focus Styles
**Problem:** Tailwind removes default browser focus outlines  
**Workaround:** Added `focus-visible:outline` classes systematically  
**Status:** Ongoing audit needed

### Issue: React Router Page Titles
**Problem:** Dynamic titles may not announce to screen readers  
**Workaround:** Use react-helmet-async for better SR support  
**Status:** Planned for Phase 2

### Issue: Modal Focus Trapping
**Problem:** Some modals don't trap focus correctly  
**Workaround:** Use react-focus-lock or similar library  
**Status:** Implementing in Phase 1

---

## Resources

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM: Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [MDN: ARIA Best Practices](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## Next Steps

1. **Immediate:** Complete Phase 1 (Priority 1 items)
2. **This Sprint:** Begin Phase 2 (color contrast, focus styles)
3. **Next Sprint:** Phase 3 (page titles, confirmations, search)
4. **Future:** Phase 4 (formal audit and conformance report)
