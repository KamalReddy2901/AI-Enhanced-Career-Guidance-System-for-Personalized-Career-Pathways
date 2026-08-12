# Bugfix Requirements Document

## Introduction

After a user logs out, the Career Simulation app incorrectly persists their assessment progress and shows "continue your assessment" messaging instead of treating the session as fresh. This creates a confusing user experience where logout appears to have no effect on the guidance state, making users believe they're still logged into their previous session.

The root cause is that `signOut()` in `AuthContext.tsx` only clears the Supabase authentication session but does not clear the localStorage guidance data (passport, pathways, recommendations, assessments, progress events, and consents). This data remains accessible after logout, causing the app to display stale user-specific information.

**Impact:** Users cannot start fresh after logout, and different users on the same device may see each other's assessment data.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Sign Out" in the Settings page THEN the system clears only the Supabase auth session but leaves all localStorage guidance data intact (passport, pathways, recommendations, assessments, progress, consents)

1.2 WHEN a user logs out and returns to the app THEN the system still shows "continue your assessment" messaging with the previous user's progress data

1.3 WHEN a user logs out THEN the system does not clear cached assessment runs stored in localStorage under key 'cc_guidance_assessment_runs'

1.4 WHEN a user logs out THEN the system does not clear progress events stored in localStorage under key 'cc_guidance_progress_events'

1.5 WHEN a user logs out THEN the system does not clear consent records stored in localStorage under key 'cc_guidance_consents'

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Sign Out" in the Settings page THEN the system SHALL clear all localStorage guidance data including passport, pathways, recommendations, assessments, progress events, and consents in addition to clearing the Supabase auth session

2.2 WHEN a user logs out and returns to the app THEN the system SHALL display the fresh onboarding/welcome state without any previous user's assessment data or progress

2.3 WHEN a user logs out THEN the system SHALL clear all localStorage keys that start with 'cc_guidance_' prefix to ensure complete session cleanup

2.4 WHEN a user logs out THEN the system SHALL reset the GuidanceContext state to its initial empty state (null passport, null recommendations, empty pathways array)

2.5 WHEN a user logs out and a different user logs in on the same device THEN the system SHALL NOT display the previous user's guidance data or assessment progress

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user who is not signed in uses the app THEN the system SHALL CONTINUE TO store guidance data in localStorage for anonymous usage

3.2 WHEN a user is signed in and making progress THEN the system SHALL CONTINUE TO sync guidance data to both localStorage and Supabase as currently implemented

3.3 WHEN a user uses the "Delete guidance data" button in Settings THEN the system SHALL CONTINUE TO use the existing `resetGuidance()` and `deleteAllGuidanceData()` functions without modification

3.4 WHEN a user signs in after being anonymous THEN the system SHALL CONTINUE TO migrate local guidance data to the cloud as currently implemented in `migrateLocalGuidanceToCloud()`

3.5 WHEN a user clears browser data manually THEN the system SHALL CONTINUE TO handle missing localStorage gracefully without crashes

3.6 WHEN a user switches between signed-in and signed-out states without logging out (e.g., session expiry) THEN the system SHALL CONTINUE TO handle auth state changes via the existing `onAuthStateChange` listener
