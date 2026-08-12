# Bugfix Requirements Document

## Introduction

The Career Simulation app has navigation and UI consistency issues that affect user experience:

1. **Navigation overflow menu**: The top bar uses a "More" dropdown menu on desktop to hide navigation options (Archive and Settings when signed in). Users expect all primary navigation to be visible in one place without requiring a dropdown interaction.

2. **Missing cloud background**: The ScrollingTitles cloud background appears on the home page hero section but is missing from the Explore tab (JobOverviewPage), creating visual inconsistency between these related sections.

**Impact:** Users must click through an extra menu to access important features, and the visual experience is inconsistent across similar pages.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a signed-in user views the desktop navigation bar THEN the system hides "Archive" and "Settings" links behind a "More" dropdown menu with MoreHorizontal icon

1.2 WHEN a user views the desktop navigation on screens ≥768px (md breakpoint) THEN the system only shows 4 primary links (Home, Explore, Pathways, Counselor) and requires clicking "More" to access additional navigation

1.3 WHEN a user navigates to the Explore tab (/job page) THEN the system does not display the ScrollingTitles cloud background that appears on the home page

1.4 WHEN a user compares the home page hero section with the JobOverviewPage THEN the system shows ScrollingTitles background on home but not on JobOverviewPage, creating visual inconsistency

### Expected Behavior (Correct)

2.1 WHEN a signed-in user views the desktop navigation bar THEN the system SHALL display all navigation links (Home, Explore, Pathways, Counselor, Archive, Settings) visibly in the navigation bar without requiring a dropdown menu

2.2 WHEN a user views the desktop navigation on screens ≥768px THEN the system SHALL show all primary navigation links inline with appropriate spacing and responsive behavior

2.3 WHEN a user navigates to the Explore tab (JobOverviewPage) THEN the system SHALL display the ScrollingTitles cloud background for visual consistency with the home page

2.4 WHEN a user views the JobSearchEmptyState on JobOverviewPage THEN the system SHALL show the ScrollingTitles component in the background with the same styling (opacity, animation) as the home page hero

2.5 WHEN the navigation bar needs to accommodate all links on medium screens THEN the system SHALL use responsive font sizing or icon-only display for larger link sets while keeping all options visible

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views the mobile navigation (screens <768px) THEN the system SHALL CONTINUE TO use the hamburger menu with full dropdown navigation as currently implemented

3.2 WHEN a user clicks navigation links THEN the system SHALL CONTINUE TO play the navigate sound and update the active state as currently implemented

3.3 WHEN a user navigates between pages THEN the system SHALL CONTINUE TO close the mobile menu automatically via the useEffect hook

3.4 WHEN the navigation displays the language switcher THEN the system SHALL CONTINUE TO show it in compact mode as currently implemented

3.5 WHEN a user is not signed in THEN the system SHALL CONTINUE TO show only the Settings link (without Archive) in navigation

3.6 WHEN ScrollingTitles is displayed THEN the system SHALL CONTINUE TO use the same animation speed, direction, opacity, and title data from JOB_TITLES as currently implemented

3.7 WHEN a user navigates to pages other than home or JobOverviewPage THEN the system SHALL CONTINUE TO NOT display ScrollingTitles background (preserve current behavior for other pages)
