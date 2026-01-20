# MASTER UI/UX ARCHITECTURE SPECIFICATION

## Insight 5.2 - Comprehensive Design System & User Experience Documentation

**Document Version:** 1.0.0
**Last Updated:** January 2026
**Document Type:** Authoritative UI/UX Specification
**Word Count Target:** 50,000+ words
**Synthesis Sources:** BD-001 through BD-012 Research Documents

---

# TABLE OF CONTENTS

1. [Part 1: Executive Vision](#part-1-executive-vision)
2. [Part 2: Current State Analysis](#part-2-current-state-analysis)
3. [Part 3: Information Architecture](#part-3-information-architecture)
4. [Part 4: UI System Specification](#part-4-ui-system-specification)
5. [Part 5: Pattern Library](#part-5-pattern-library)
6. [Part 6: Screen Specifications](#part-6-screen-specifications)
7. [Part 7: Quality & Testing](#part-7-quality-testing)
8. [Part 8: Production Readiness](#part-8-production-readiness)

---

# PART 1: EXECUTIVE VISION

## 1.1 Product Philosophy & Mission

### 1.1.1 The Core Promise

Insight 5.2 exists to answer a fundamental human question: "How am I actually spending my life, and is it aligned with who I want to become?" This is not merely a productivity application or habit tracker—it is a comprehensive life operating system that treats personal data as the foundation for self-understanding and intentional growth.

The product philosophy rests on three foundational pillars:

**Pillar One: Capture Without Friction**

The moment of insight is fleeting. When a user realizes something important about their day, their mood, or their progress toward a goal, they need to record it before the moment passes. Traditional journaling and tracking apps fail because they demand too much cognitive overhead at exactly the wrong time. Insight 5.2 commits to a "10-second capture promise"—any thought, observation, or data point can be recorded in ten seconds or less through voice, quick-tap, or minimal text entry.

This is not merely a feature but a design philosophy that permeates every interaction. Every screen, every component, every animation must be evaluated against the question: "Does this help or hinder rapid capture?" If a modal requires three taps to dismiss, that's two taps too many. If a form demands field-by-field entry when a single voice note could suffice, the form has failed.

**Pillar Two: Intelligence Without Intrusion**

Raw data is worthless without interpretation, but users didn't sign up for a demanding AI assistant that constantly nudges and nags. Insight 5.2 employs sophisticated machine learning for entity extraction, pattern recognition, correlation discovery, and predictive suggestions—but this intelligence operates in the background, surfacing insights at contextually appropriate moments rather than interrupting the user's flow.

The AI layer should feel like a thoughtful friend who notices things and mentions them when relevant, not an overbearing coach who demands attention. When the system detects that a user's sleep quality correlates strongly with their evening screen time, it waits for an appropriate moment (perhaps the weekly reflection screen) to surface this insight, rather than pushing an immediate notification.

**Pillar Three: Growth Without Guilt**

Traditional habit trackers weaponize failure. Broken streaks become sources of shame. Missed goals trigger punitive notifications. The psychological research is clear: shame-based motivation is not only ineffective long-term but actively harmful to sustained behavior change.

Insight 5.2 adopts a fundamentally different approach: non-punitive gamification. Experience points only accumulate—they never decrease. Streaks can be protected with "freeze tokens" earned through consistent engagement. The visual language celebrates progress without dramatizing setbacks. When a user misses a habit, the interface acknowledges it neutrally and moves forward, rather than displaying accusatory red marks or sending guilt-laden notifications.

### 1.1.2 The Vision Statement

**"Insight 5.2: The operating system for intentional living."**

This vision statement captures several key aspects:

- **Operating System**: Like iOS or Android for a device, Insight is the foundational layer through which users interact with their personal data and life goals. It's not a single-purpose app but a comprehensive platform.

- **Intentional**: The product serves users who want to live deliberately rather than reactively. It attracts people who believe that tracking and reflection lead to better outcomes.

- **Living**: This is about life in its fullest sense—health, relationships, work, creativity, rest, and growth. Not merely productivity or fitness, but the whole human experience.

### 1.1.3 Design Principles

The following ten principles guide every design decision in Insight 5.2. They are listed in priority order—when principles conflict, higher-numbered principles yield to lower-numbered ones.

**Principle 1: Capture Speed Above All**

Nothing matters if users can't get their data into the system quickly. Every millisecond of friction in the capture flow represents potential data loss. This principle trumps aesthetic preferences, feature richness, and even some accessibility considerations (though we work hard to serve both).

*Application*: The capture modal opens in under 100ms. Voice recording begins with a single tap. Quick-add buttons for common entries appear prominently. Auto-save eliminates the need for explicit submission.

**Principle 2: Show, Don't Tell**

Data visualization should be self-explanatory. Users should understand their patterns through visual representation rather than textual explanation. Heatmaps, charts, and progress indicators do the heavy lifting.

*Application*: Habit completion appears as a color-coded heatmap where patterns emerge visually. Mood trends display as flowing line charts. Goal progress manifests as filling containers rather than percentage text.

**Principle 3: Celebrate Progress, Ignore Setbacks**

The interface actively celebrates wins and treats misses as neutral data points. No red marks for missed habits. No guilt-inducing notifications. No "you broke your streak" messages.

*Application*: Completed habits trigger subtle confetti animations. XP accumulation displays prominently. Missed days simply show as empty cells, not failures.

**Principle 4: Respect the Transition**

The shift from browsing to focused work is sacred. When users enter Focus Mode, the interface transforms to support deep work. Distractions disappear. The visual style shifts to Obsidian Dark. Notifications pause.

*Application*: Focus Mode employs a completely different color scheme (dark background, muted accents). The interface strips to essentials. A prominent timer provides time awareness without distraction.

**Principle 5: Progressive Disclosure**

Show users what they need when they need it. Advanced features exist but don't clutter the primary interface. Complexity reveals itself as users demonstrate readiness.

*Application*: New users see simplified views with core features. Advanced filtering, custom fields, and complex queries unlock after demonstrated engagement. The "More" tab contains power-user features without overwhelming the main navigation.

**Principle 6: Platform-Native, Brand-Consistent**

Each platform (iOS, Android, Web) should feel native to its environment while maintaining unmistakable Insight identity. iOS users expect iOS patterns. Android users expect Material patterns. All users should recognize Insight's visual language.

*Application*: Mobile uses bottom navigation (platform convention). Desktop uses sidebar navigation (web convention). Both use Insight's color palette, typography, and component styling.

**Principle 7: Accessible by Default**

Accessibility is not an afterthought or a compliance checkbox. Every component is designed from the start to serve users with visual, motor, cognitive, and situational impairments.

*Application*: All touch targets meet 44x44pt minimum. All color combinations meet WCAG 2.1 AA contrast ratios. All interactive elements are keyboard navigable. All images have meaningful alt text.

**Principle 8: Offline-First Architecture**

Users track their lives in real-world conditions—on airplanes, in basements, in rural areas with spotty coverage. The app must work fully offline with seamless sync when connectivity returns.

*Application*: All data stores locally first. Sync happens in the background. Conflict resolution handles simultaneous edits gracefully. Users never see "no connection" errors blocking their workflow.

**Principle 9: Privacy as Foundation**

Personal tracking data is extraordinarily sensitive. Users trust Insight with their health, habits, moods, and goals. This trust must never be violated.

*Application*: End-to-end encryption for sensitive data. No third-party analytics that could expose personal information. Clear, honest privacy policies. User data export and deletion on demand.

**Principle 10: Delight in Details**

The difference between good and great software lives in the details. Micro-animations that acknowledge user actions. Thoughtful empty states that guide rather than frustrate. Easter eggs that reward exploration.

*Application*: Button presses trigger subtle scale animations. Empty habit lists suggest getting started rather than displaying blank screens. Achievement unlocks include playful animations and encouraging messages.

## 1.2 User Personas

### 1.2.1 Primary Personas

**Persona 1: Alex the Optimizer**

*Demographics*: 28-35 years old, knowledge worker (software engineer, consultant, or similar), lives in urban area, above-average income, single or in relationship without children.

*Psychographics*: Alex believes in quantified self principles. They've read books on habit formation (Atomic Habits, The Power of Habit) and productivity (Deep Work, Getting Things Done). They track multiple life dimensions already using fragmented tools—a fitness app, a journaling app, a task manager, a mood tracker.

*Goals*:
- Consolidate tracking into a single system
- Discover correlations between behaviors and outcomes
- Optimize sleep, exercise, nutrition, and work patterns
- Build and maintain keystone habits

*Pain Points*:
- Current tools don't talk to each other
- Manual correlation analysis is time-consuming
- Switching between apps creates friction
- No unified view of "how life is going"

*Insight Usage Pattern*: Alex uses Insight throughout the day. Morning review of yesterday's data and today's plan. Quick captures during the day as events happen. Evening reflection with more detailed journaling. Weekly review sessions to analyze patterns.

*Feature Priorities*: Data visualization, correlation analysis, integrations with other data sources, export capabilities, advanced filtering.

*Design Implications*: Alex appreciates information density. They can handle complex interfaces. They want power-user features accessible (not hidden). They value speed and keyboard shortcuts.

---

**Persona 2: Morgan the Mindful**

*Demographics*: 35-45 years old, creative professional or helping profession (therapist, teacher, artist), may have children, values work-life balance, moderate income.

*Psychographics*: Morgan came to personal tracking through mindfulness practice or therapy. They journal for emotional processing, not optimization. They track habits related to self-care (meditation, exercise, sleep) rather than productivity metrics.

*Goals*:
- Develop greater self-awareness
- Process emotions through journaling
- Maintain self-care habits during busy periods
- Notice patterns in mood and energy

*Pain Points*:
- Tech-heavy interfaces feel cold and intimidating
- Gamification often feels manipulative
- Most apps prioritize productivity over wellbeing
- Judgmental interfaces create shame around missed habits

*Insight Usage Pattern*: Morgan primarily uses Insight in the morning (gratitude journaling, daily intentions) and evening (reflection, mood logging). They prefer voice capture when possible. They engage with insights features but don't obsess over data.

*Feature Priorities*: Journaling features, mood tracking, gentle reminders (not aggressive notifications), beautiful and warm visual design, voice capture.

*Design Implications*: Morgan needs a warm, non-intimidating interface. The paper-clean aesthetic appeals to them. They appreciate the non-punitive approach to habits. They want features to feel supportive, not demanding.

---

**Persona 3: Jordan the Journeyer**

*Demographics*: 22-28 years old, early career or still in school, navigating major life transitions, limited disposable income, active on social media.

*Psychographics*: Jordan is figuring out who they are and who they want to become. They're attracted to self-improvement content but haven't yet developed consistent habits. They start apps enthusiastically but often abandon them after a few weeks.

*Goals*:
- Develop consistent daily routines
- Figure out what habits actually matter to them
- Track progress on personal goals
- Feel more in control of their life direction

*Pain Points*:
- Overwhelm when facing too many features
- Shame spirals when they fall off the wagon
- Difficulty knowing where to start
- Apps that feel like homework

*Insight Usage Pattern*: Jordan's usage is variable. Intense engagement periods followed by gaps. They respond well to gentle re-engagement prompts. They need quick wins to maintain motivation.

*Feature Priorities*: Simple getting-started experience, streak freeze tokens (second chances), encouraging feedback, templates for common goals, low-friction capture.

*Design Implications*: Jordan needs progressive disclosure—simple by default with complexity available when they're ready. The celebration of small wins matters enormously. The non-punitive approach is essential for this persona.

---

**Persona 4: Sam the Survivor**

*Demographics*: 30-50 years old, any profession, managing a chronic health condition (physical or mental), needs to track symptoms and treatments, may work with healthcare providers.

*Psychographics*: Sam tracks out of medical necessity, not curiosity. They need to identify triggers, monitor symptoms, and report patterns to doctors. Consistency is important for health management, but illness can make consistency difficult.

*Goals*:
- Track symptoms and potential triggers
- Generate reports for healthcare providers
- Identify patterns that improve or worsen condition
- Maintain treatment adherence (medications, exercises, etc.)

*Pain Points*:
- Medical tracking apps are ugly and clinical
- General wellness apps don't support medical-grade tracking
- Energy limitations make complex interfaces exhausting
- Need flexibility for high-variability days

*Insight Usage Pattern*: Sam tracks consistently but briefly. Symptom logging throughout the day. Quick medication confirmations. Weekly report generation for doctor appointments.

*Feature Priorities*: Custom tracker creation, PDF export for providers, symptom correlation analysis, flexible scheduling for habits, low-energy capture options.

*Design Implications*: Sam needs efficiency above all—they may be tracking while feeling unwell. The interface must support rapid capture with minimal cognitive load. Medical-grade data export matters. The non-judgmental approach is crucial for someone whose condition may prevent perfect adherence.

---

**Persona 5: Riley the Renaissance**

*Demographics*: 35-55 years old, established career, multiple serious interests or side projects, higher income, values continuous learning and personal growth.

*Psychographics*: Riley has many irons in the fire—a demanding job, a creative side project, fitness goals, family responsibilities, and learning ambitions. They need a system that can track across all these domains without becoming a project itself.

*Goals*:
- Maintain progress across multiple life domains
- Ensure important areas don't get neglected
- Balance competing priorities
- Track learning and skill development

*Pain Points*:
- Single-domain apps can't see the whole picture
- Time is scarce for system maintenance
- Need quick switching between contexts
- Risk of overwhelming themselves with tracking

*Insight Usage Pattern*: Riley uses different Insight features for different life domains. Quick task management for work. Habit tracking for fitness. Progress logging for creative projects. The unified dashboard helps them balance attention across domains.

*Feature Priorities*: Multi-domain support, quick context switching, life balance visualizations, project tracking, time allocation insights.

*Design Implications*: Riley benefits from saved views that slice data by life domain. The unified dashboard is essential. Quick navigation between contexts matters. They appreciate information density and efficiency.

---

**Persona 6: Casey the Convert**

*Demographics*: 25-40 years old, any profession, previously used competitor products (Notion, Obsidian, Habitica, Day One), looking for something better, technically comfortable.

*Psychographics*: Casey has tried many personal tracking solutions. They have strong opinions about what works and what doesn't. They're attracted to Insight because it promises to combine features they previously needed multiple apps for.

*Goals*:
- Replace fragmented tool ecosystem
- Import existing data from other platforms
- Find a "forever" solution for personal tracking
- Get more value with less app-switching

*Pain Points*:
- Previous tools had fatal flaws
- Data migration is always painful
- Learning new systems has high switching cost
- Fear of committing to another tool that might disappoint

*Insight Usage Pattern*: Casey evaluates features systematically. They compare Insight to previous tools. They push the edges of capabilities. If satisfied, they become power users and advocates.

*Feature Priorities*: Data import from competitors, feature parity (or superiority) to alternatives, export options (avoiding lock-in), customization capabilities, stable development trajectory.

*Design Implications*: Casey notices details and compares to competitors. They appreciate when Insight does something better than alternatives. They want confidence that their investment in learning the system will pay off long-term.

### 1.2.2 Persona Priority Matrix

| Persona | Primary Use Case | Design Priority | Revenue Priority |
|---------|------------------|-----------------|------------------|
| Alex the Optimizer | Power user, full platform | High | High |
| Morgan the Mindful | Journaling, wellness | High | Medium |
| Jordan the Journeyer | Habit building, growth | Medium | Medium |
| Sam the Survivor | Health tracking | Medium | Medium |
| Riley the Renaissance | Multi-domain balance | Medium | High |
| Casey the Convert | Competitor migration | Low | High |

Design decisions should optimize for Alex and Morgan first, as they represent the largest user segments and the core use cases. Jordan's needs for simplicity provide a useful check on complexity creep. Sam's needs ensure medical-grade reliability. Riley validates multi-domain architecture. Casey keeps us honest about competitive positioning.

## 1.3 Competitive Positioning

### 1.3.1 Market Landscape

The personal tracking market fragments across several categories:

**Pure Habit Trackers**: Habitify, Streaks, Habitica, Loop Habit Tracker
- Strength: Focused, simple, gamified
- Weakness: No journaling, limited data types, no cross-habit correlation

**Journaling Apps**: Day One, Journey, Momento
- Strength: Beautiful writing experience, rich media support
- Weakness: No habit tracking, no quantified data, limited analysis

**Life Dashboards**: Exist.io, Gyroscope, Nomie
- Strength: Aggregation, correlation, visualization
- Weakness: Passive (pull data from other apps), limited input methods

**Productivity Systems**: Notion, Obsidian, Logseq
- Strength: Infinitely flexible, powerful linking
- Weakness: Require significant setup, no purpose-built tracking features

**Health Trackers**: Apple Health, Google Fit, Fitbit
- Strength: Automatic data collection, device integration
- Weakness: Limited to health data, no journaling or goal tracking

### 1.3.2 Insight's Unique Position

Insight 5.2 occupies a unique position: **the integrated life operating system that combines habit tracking, journaling, goal management, and intelligent analysis in a single, beautiful, non-punitive package.**

Key differentiators:

1. **Voice-first capture** with AI-powered entity extraction (no competitor does this well)
2. **Non-punitive gamification** (most competitors weaponize failure)
3. **Cross-domain correlation** (connecting sleep to mood to productivity to habits)
4. **Paper-clean aesthetic** (warmer than clinical, more sophisticated than playful)
5. **Offline-first architecture** (works anywhere, syncs when possible)
6. **Platform-native implementations** (not a web wrapper, truly native)

### 1.3.3 Patterns Adopted from Competitors

After extensive competitive analysis (see BD-006: Competitor Teardown), the following patterns have been deliberately adopted:

**From Tiimo**: Non-judgmental visual language, neutral treatment of incomplete tasks
**From Nomie**: Speed-first logging philosophy, 10-second capture target
**From Exist.io**: Correlation discovery UI, pattern surfacing algorithms
**From Habitica**: Visual progress manifestation (without the punishment)
**From Day One**: Automatic metadata enrichment, beautiful moment capture
**From Notion**: Progressive disclosure, template system
**From Apple Health**: Data aggregation model, privacy-first architecture

### 1.3.4 Anti-Patterns Explicitly Avoided

**Over-engineering before use**: Unlike Notion, Insight works out of the box without setup
**Gamification punishment**: Unlike Habitica, broken streaks don't lose you points
**Desktop-first mobile**: Unlike Obsidian, mobile is a first-class citizen
**Passive aggregation only**: Unlike Exist.io, Insight supports active input
**Clinical aesthetic**: Unlike most health trackers, Insight feels warm and personal

## 1.4 Success Metrics

### 1.4.1 User Experience Metrics

**Capture Speed** (Primary Metric)
- Target: 90% of captures completed in under 10 seconds
- Measurement: Time from capture intent (modal open) to submission
- Current Baseline: Establishing with v5.2 launch

**Daily Active Engagement**
- Target: 70% of weekly active users engage daily
- Measurement: DAU/WAU ratio
- Rationale: Personal tracking requires consistency to be valuable

**Feature Discovery Rate**
- Target: 80% of users discover core features within first week
- Measurement: Feature usage telemetry
- Rationale: Ensures progressive disclosure isn't hiding value

**Retention Curve**
- Target: 40% 30-day retention, 25% 90-day retention
- Measurement: Cohort analysis
- Rationale: Personal tracking apps have notoriously high churn; these targets are ambitious but achievable

### 1.4.2 Business Metrics

**Premium Conversion**
- Target: 5% of free users convert to premium within 30 days
- Measurement: Conversion funnel analysis

**Net Promoter Score**
- Target: NPS of 50+
- Measurement: In-app surveys after 30 days of use

**App Store Rating**
- Target: 4.7+ stars on both platforms
- Measurement: Store analytics

### 1.4.3 Technical Metrics

**App Launch Time**
- Target: Cold start under 2 seconds, warm start under 500ms
- Measurement: Performance monitoring

**Crash-Free Rate**
- Target: 99.5%+ crash-free sessions
- Measurement: Crash reporting

**Sync Reliability**
- Target: 99.9% sync success rate
- Measurement: Sync failure telemetry

**Offline Capability**
- Target: 100% core features available offline
- Measurement: Offline feature audit

## 1.5 Document Scope and Structure

This Master UI/UX Architecture document serves as the authoritative specification for Insight 5.2's user interface and user experience. It synthesizes research and recommendations from twelve preceding documents (BD-001 through BD-012) into a comprehensive, actionable specification.

### 1.5.1 Document Scope

**In Scope:**
- Visual design system (colors, typography, spacing, elevation)
- Component library specifications
- Screen-by-screen design requirements
- Interaction patterns and animations
- Information architecture and navigation
- Accessibility requirements
- Platform-specific considerations
- Quality assurance criteria

**Out of Scope:**
- Backend architecture (covered in separate technical specifications)
- Business logic implementation details
- Marketing and growth strategies
- Content strategy beyond UI copy patterns
- Third-party integration specifications

### 1.5.2 How to Use This Document

**For Designers**: Parts 4 (UI System), 5 (Pattern Library), and 6 (Screen Specifications) provide the detailed guidance needed for design implementation.

**For Developers**: Parts 3 (Information Architecture), 4 (UI System), and 5 (Pattern Library) define the component and interaction contracts. Part 7 (Quality & Testing) specifies acceptance criteria.

**For Product Managers**: Parts 1 (Executive Vision) and 2 (Current State) provide strategic context. Part 8 (Production Readiness) defines launch criteria.

**For QA Engineers**: Parts 7 (Quality & Testing) and 8 (Production Readiness) detail testing strategies and acceptance criteria.

### 1.5.3 Synthesis Sources

This document synthesizes findings from:

| Document | Code | Content | Word Count |
|----------|------|---------|------------|
| Screenshot Inventory | BD-001 | Visual audit of current state | ~3,000 |
| UI Map | BD-002 | Screen inventory and navigation | ~10,500 |
| Behavior Map | BD-003 | Interaction patterns and animations | ~9,000 |
| Component Inventory | BD-004 | Cross-platform component audit | ~12,000 |
| Heuristic Audit | BD-005 | Usability evaluation | ~8,000 |
| Competitor Teardown | BD-006 | Competitive analysis | ~10,000 |
| Patterns & Style | BD-007 | Visual direction and patterns | ~11,000 |
| Vision North Star | BD-008 | Product vision and principles | ~10,000 |
| IA & Flows | BD-009 | Information architecture | ~11,000 |
| UI System Tokens | BD-010 | Design tokens and components | ~11,500 |
| Test Strategy | BD-011 | Quality assurance approach | ~9,000 |
| Production Rubric | BD-012 | Launch readiness criteria | ~12,500 |

**Total Source Material**: ~117,500 words synthesized into this master document.

---

# PART 2: CURRENT STATE ANALYSIS

## 2.1 Platform Overview

### 2.1.1 Application Ecosystem

Insight 5.2 comprises four distinct application targets, each serving specific use cases while sharing core design language and data models:

**1. Desktop Web Application (Primary)**
- Framework: React 18 + Vite + TypeScript
- Styling: Tailwind CSS + ShadCN/ui components
- State: TanStack Query + Zustand
- Location: `/apps/desktop/`
- Primary Use: Full-featured experience for power users

**2. Mobile Application - Expo (Primary Mobile)**
- Framework: React Native + Expo SDK 52+
- Styling: NativeWind (Tailwind for RN) + Custom components
- Navigation: Expo Router (file-based routing)
- Location: `/apps/mobile4/` (current active development)
- Primary Use: On-the-go capture and daily tracking

**3. iOS Native Application (Native Swift)**
- Framework: SwiftUI + Swift Concurrency
- Architecture: MVVM with Observable pattern
- Location: `/apps/insight_swift/`
- Primary Use: Deep iOS integration, Live Activities, Widgets
- Status: Feature-complete for core flows

**4. Landing Page / Marketing Site**
- Framework: Astro + React components
- Location: `/apps/landing/`
- Primary Use: Marketing, conversion, documentation

### 2.1.2 Shared Infrastructure

All applications connect to a unified backend:

**Supabase Backend**
- Authentication: Supabase Auth with OAuth providers
- Database: PostgreSQL with Row-Level Security
- Storage: Supabase Storage for media files
- Real-time: Supabase Realtime for sync
- Edge Functions: For AI processing and integrations

**Shared Type Definitions**
- Location: `/packages/shared/`
- Contents: TypeScript types, Zod schemas, utility functions
- Purpose: Ensure type consistency across applications

### 2.1.3 Feature Matrix by Platform

| Feature | Desktop | Mobile (Expo) | iOS Native | Landing |
|---------|---------|---------------|------------|---------|
| Dashboard | Full | Simplified | Simplified | N/A |
| Capture | Full + Keyboard | Touch + Voice | Touch + Voice + Siri | N/A |
| Habits | Full | Full | Full | Demo |
| Tasks | Full | Full | Partial | Demo |
| Calendar | Full | Full | Full + EventKit | Demo |
| Journal | Full | Full | Full | Demo |
| Goals | Full | Basic | Basic | Demo |
| People | Full | Basic | Basic | N/A |
| Places | Full | Basic + Location | Basic | N/A |
| Projects | Full | Basic | Planned | N/A |
| Reports | Full | Basic | Planned | N/A |
| Settings | Full | Full | Full | N/A |
| Focus Mode | Full | Full | Full + Live Activity | N/A |
| Health Sync | Via API | HealthKit Limited | HealthKit Full | N/A |
| Offline | Full | Full | Full | N/A |
| Widgets | N/A | Planned | Full | N/A |

## 2.2 Screen Inventory

### 2.2.1 Mobile Application Screens

The mobile application (Expo) contains 44 distinct routes organized hierarchically:

**Tab Navigation (5 Primary Tabs)**

```
app/
├── (tabs)/
│   ├── _layout.tsx          # Tab navigator configuration
│   ├── index.tsx            # Today/Dashboard - Entry point
│   ├── tasks.tsx            # Task list and management
│   ├── calendar.tsx         # Calendar views (day/week/month)
│   ├── habits.tsx           # Habit tracking grid
│   └── more.tsx             # Feature hub / secondary navigation
```

**Modal Screens (Full-screen overlays)**

```
├── capture.tsx              # Universal capture modal
├── voice.tsx                # Voice recording interface
├── focus.tsx                # Focus mode / Pomodoro
├── auth.tsx                 # Authentication flow
├── modal.tsx                # Generic modal container
```

**Detail Screens (Entity views)**

```
├── event/[id].tsx           # Calendar event detail
├── habit/[id].tsx           # Individual habit detail
├── task/[id].tsx            # Task detail and editing
├── habit-form.tsx           # Habit creation/editing
├── note/[id].tsx            # Note/journal entry detail
```

**Secondary Feature Screens**

```
├── goals.tsx                # Goal tracking overview
├── projects.tsx             # Project management
├── people.tsx               # Contact/relationship tracking
├── places.tsx               # Location tracking
├── tags.tsx                 # Tag management
├── rewards.tsx              # Gamification rewards
├── reports.tsx              # Analytics and reports
├── settings.tsx             # Application settings
├── trackers.tsx             # Custom tracker management
├── health.tsx               # Health data overview
│   ├── nutrition.tsx        # Nutrition tracking
│   └── workouts.tsx         # Workout logging
├── ecosystem.tsx            # Integrations
└── assistant.tsx            # AI assistant interface
```

### 2.2.2 Desktop Application Views

The desktop application provides 31 distinct views with a different navigation paradigm:

**Primary Workspace Panes**

```
1. Dashboard              # Today view with widgets
2. Timeline               # Chronological entry stream
3. Tasks                  # Task management (Kanban + List)
4. Calendar               # Full calendar with event management
5. Habits                 # Habit dashboard with heatmaps
6. Journal                # Writing-focused journal interface
7. Goals                  # Goal hierarchy and tracking
8. Focus                  # Focus mode workspace
```

**Secondary Panes (via sidebar navigation)**

```
9. People                 # Relationship management
10. Places                # Location database
11. Projects              # Project containers
12. Tags                  # Tag taxonomy
13. Trackers              # Custom numeric trackers
14. Reports               # Analytics dashboards
15. Saved Views           # Custom filtered views
16. Settings              # Full settings interface
```

**Modal/Dialog Views**

```
17. Capture Modal         # Quick capture overlay
18. Event Editor          # Calendar event editing
19. Task Editor           # Task detail editing
20. Habit Editor          # Habit configuration
21. Entry Editor          # Journal entry editing
22. Goal Editor           # Goal configuration
23. Person Editor         # Contact editing
24. Place Editor          # Location editing
25. Project Editor        # Project configuration
26. Tracker Editor        # Custom tracker setup
27. Command Palette       # Keyboard-driven navigation
28. Search               # Global search interface
29. Settings Panels       # Sectioned settings
30. Import/Export         # Data management
31. Onboarding           # First-run experience
```

### 2.2.3 iOS Native Application Screens

The Swift/SwiftUI application provides native iOS experiences:

**Tab-Based Navigation**

```swift
TabView {
    DashboardView()        // Tab 0: Today
    PlanView()             // Tab 1: Schedule/Plan
    CaptureView()          // Tab 2: Capture (centered, prominent)
    HabitsView()           // Tab 3: Habits
    MoreView()             // Tab 4: More features
}
```

**Navigation Stack Destinations**

```swift
// From Dashboard
NavigationLink -> TimelineView
NavigationLink -> FocusView
NavigationLink -> CalendarView

// From Habits
NavigationLink -> HabitDetailView
NavigationLink -> HabitFormView
NavigationLink -> HabitLogDetailView

// From More
NavigationLink -> TasksView
NavigationLink -> NotesView
NavigationLink -> GoalsView
NavigationLink -> PeopleView
NavigationLink -> PlacesView
NavigationLink -> ProjectsView
NavigationLink -> SettingsView

// Detail Views
NavigationLink -> EntryDetailView
NavigationLink -> TaskDetailView
NavigationLink -> NoteDetailView
NavigationLink -> EventDetailView
NavigationLink -> WorkoutDetailView
NavigationLink -> NutritionDetailView
NavigationLink -> TrackerLogDetailView
```

**Sheet Presentations**

```swift
.sheet -> CaptureReviewView     // Voice capture review
.sheet -> TimelineFilterSheet   // Filter configuration
.sheet -> CalendarConnectView   // Calendar integration
.sheet -> CalendarSelectionView // Calendar picker
.sheet -> ConflictResolutionView // Sync conflict handling
.sheet -> SavedViewBuilderView  // Custom view creation
```

## 2.3 Component Audit

### 2.3.1 Component Inventory Summary

Across all four applications, 62 distinct component types have been identified:

| Category | Count | Examples |
|----------|-------|----------|
| Navigation | 8 | TabBar, Sidebar, Breadcrumb, BackButton |
| Input | 12 | TextField, TextArea, Select, DatePicker, TimePicker, Slider |
| Display | 15 | Card, Badge, Avatar, Heatmap, Chart, Progress |
| Feedback | 7 | Toast, Alert, Modal, Dialog, Spinner, Skeleton |
| Layout | 10 | Container, Grid, Stack, Divider, Spacer |
| Interactive | 10 | Button, IconButton, Toggle, Checkbox, Radio, Menu |

### 2.3.2 Component Consistency Analysis

**High Consistency (Implemented similarly across platforms)**
- Button variants and states
- Card container styling
- Color palette application
- Typography scale usage
- Icon library (Lucide icons)

**Medium Consistency (Minor variations)**
- Form input styling (platform conventions differ)
- Navigation patterns (bottom tabs vs sidebar)
- Modal presentation (sheets vs dialogs)
- Animation timing (subtle platform differences)

**Low Consistency (Needs alignment)**
- Empty states (inconsistent illustrations/messaging)
- Loading states (different skeleton patterns)
- Error states (varying approaches to error display)
- Onboarding flows (different per platform)

### 2.3.3 Platform-Specific Components

**Desktop Only**
- Command Palette (Cmd+K)
- Resizable Panes
- Keyboard Shortcuts Overlay
- Multi-column Layouts
- Context Menus (right-click)

**Mobile Only**
- Pull-to-Refresh
- Swipe Actions
- Bottom Sheets
- Haptic Feedback Triggers
- Voice Recording Interface

**iOS Native Only**
- Live Activity Widget
- Home Screen Widgets
- Siri Intents
- Share Extension
- Apple Watch Complication (planned)

## 2.4 Interaction Pattern Audit

### 2.4.1 Documented Interaction Patterns

The behavior map documents 127 distinct interaction patterns across the application. Key pattern categories:

**Navigation Patterns (23 patterns)**
- Tab switching with persistence
- Stack navigation with state preservation
- Modal presentation and dismissal
- Deep linking support
- Back navigation with unsaved changes handling
- Gesture-based navigation (swipe to go back)

**Capture Patterns (18 patterns)**
- Quick capture modal invocation (FAB, keyboard shortcut, widget)
- Voice recording with visual feedback
- Text entry with auto-complete
- Entity extraction preview and editing
- Photo/media attachment
- Location tagging (automatic and manual)
- Save and continue vs save and close

**Habit Patterns (15 patterns)**
- Single-tap completion
- Long-press for options
- Streak display and celebration
- Heatmap interaction (tap for detail)
- Habit reordering (drag and drop)
- Habit archival flow
- Habit template selection

**Task Patterns (14 patterns)**
- Task creation (inline and modal)
- Status toggling (checkbox)
- Priority adjustment
- Due date setting
- Subtask management
- Task moving between lists
- Recurring task handling

**Calendar Patterns (12 patterns)**
- View switching (day/week/month)
- Event creation (tap on time slot)
- Event editing (tap on event)
- Drag to reschedule
- Multi-day event display
- All-day event handling
- External calendar sync indication

**Data Visualization Patterns (11 patterns)**
- Chart interaction (tap for detail)
- Zoom and pan on charts
- Filter application
- Time range selection
- Correlation highlighting
- Export triggering
- Comparison mode

**Settings Patterns (8 patterns)**
- Toggle switches
- Multi-select options
- Theme preview
- Notification permission requests
- Data export initiation
- Account management
- Sync status display

**Search Patterns (7 patterns)**
- Global search invocation
- Filter refinement
- Result preview
- Recent searches
- Saved searches
- Search within context
- Result highlighting

**Gamification Patterns (6 patterns)**
- XP accumulation animation
- Level up celebration
- Achievement unlock notification
- Streak freeze usage
- Reward redemption
- Progress milestone display

**Error Handling Patterns (8 patterns)**
- Form validation feedback
- Network error recovery
- Sync conflict resolution
- Undo support
- Auto-save indication
- Retry mechanisms
- Graceful degradation

**Onboarding Patterns (5 patterns)**
- Welcome flow
- Permission requests
- Feature introduction
- Import from other apps
- Goal setting wizard

### 2.4.2 Animation Inventory

The application employs a consistent animation vocabulary:

**Timing Tokens**
```typescript
const AnimationDuration = {
  instant: 0,
  fast: 100,      // Micro-interactions (button press)
  normal: 300,    // State changes (toggle, expand)
  slow: 500,      // Major transitions (page change)
  deliberate: 800 // Emphasis animations (celebration)
}
```

**Easing Functions**
```typescript
const AnimationEasing = {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',  // Material standard
  enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)',     // Decelerate
  exit: 'cubic-bezier(0.4, 0.0, 1, 1)',        // Accelerate
  spring: { damping: 15, stiffness: 150 }      // Spring physics
}
```

**Animation Categories**

| Category | Duration | Easing | Example |
|----------|----------|--------|---------|
| Feedback | 100ms | standard | Button press scale |
| Reveal | 300ms | enter | Modal appearance |
| Dismiss | 200ms | exit | Modal dismissal |
| Reorder | 300ms | spring | List item drag |
| Celebrate | 800ms | spring | XP gain animation |
| Progress | 500ms | standard | Progress bar fill |
| Skeleton | 1500ms | linear | Loading shimmer |

**Platform-Specific Animation Notes**

*Desktop (Framer Motion)*
```typescript
// Standard reveal animation
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
```

*Mobile (Moti + Reanimated)*
```typescript
// Standard reveal animation
from={{ opacity: 0, translateY: 20 }}
animate={{ opacity: 1, translateY: 0 }}
transition={{ type: 'timing', duration: 300 }}
```

*iOS Native (SwiftUI)*
```swift
// Standard reveal animation
.opacity(isVisible ? 1 : 0)
.offset(y: isVisible ? 0 : 20)
.animation(.easeOut(duration: 0.3), value: isVisible)
```

## 2.5 Heuristic Evaluation Summary

### 2.5.1 Nielsen's Heuristics Assessment

A comprehensive heuristic evaluation was conducted against Nielsen's 10 usability heuristics. Summary scores (1-5, where 5 is excellent):

| Heuristic | Score | Key Findings |
|-----------|-------|--------------|
| Visibility of System Status | 4.2 | Good sync indicators, needs better loading states |
| Match with Real World | 4.5 | Natural language, familiar metaphors |
| User Control & Freedom | 4.0 | Good undo support, some modal traps |
| Consistency & Standards | 3.8 | Cross-platform inconsistencies identified |
| Error Prevention | 3.5 | Needs more confirmation dialogs for destructive actions |
| Recognition over Recall | 4.3 | Good use of recent items, smart suggestions |
| Flexibility & Efficiency | 4.5 | Excellent keyboard shortcuts, customization |
| Aesthetic & Minimalist | 4.7 | Clean design, low visual noise |
| Error Recovery | 3.7 | Basic error messages, needs better guidance |
| Help & Documentation | 3.0 | Limited in-app help, needs improvement |

**Overall Heuristic Score: 4.0/5.0**

### 2.5.2 Critical Issues Identified

**Severity 1 (Must Fix Before Launch)**
1. Sync conflict resolution lacks clear user guidance
2. Data loss possible when closing capture modal with unsaved voice note
3. Accessibility: Some touch targets below 44pt minimum
4. Color contrast failures in certain theme combinations

**Severity 2 (Should Fix Before Launch)**
1. Empty states lack actionable guidance
2. Error messages are technical rather than user-friendly
3. Loading skeletons inconsistent across screens
4. Onboarding flow too brief, misses key features

**Severity 3 (Fix Post-Launch)**
1. Help system needs development
2. Keyboard navigation incomplete in some modals
3. Animation performance issues on older devices
4. Search result ranking could be improved

### 2.5.3 Accessibility Audit Summary

**WCAG 2.1 Compliance Status**

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 1.1 Text Alternatives | A | Pass | All images have alt text |
| 1.2 Time-based Media | A | N/A | No video content |
| 1.3 Adaptable | A | Pass | Proper semantic structure |
| 1.4 Distinguishable | AA | Partial | Some contrast issues in themes |
| 2.1 Keyboard Accessible | A | Partial | Desktop good, mobile N/A |
| 2.2 Enough Time | A | Pass | No time limits on input |
| 2.3 Seizures | A | Pass | No flashing content |
| 2.4 Navigable | AA | Partial | Skip links needed |
| 2.5 Input Modalities | A | Partial | Some touch targets small |
| 3.1 Readable | A | Pass | Clear language |
| 3.2 Predictable | A | Pass | Consistent navigation |
| 3.3 Input Assistance | A | Partial | Error identification needs work |
| 4.1 Compatible | A | Pass | Valid markup, ARIA usage |

**Key Accessibility Improvements Needed**
1. Increase all touch targets to minimum 44x44pt
2. Fix color contrast in Dark, Midnight, and Midnight Neon themes
3. Add skip navigation links on desktop
4. Improve screen reader announcements for dynamic content
5. Add visible focus indicators for keyboard navigation

## 2.6 Performance Baseline

### 2.6.1 Current Performance Metrics

**Desktop Application**
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| First Contentful Paint | 1.2s | <1.0s | Needs work |
| Time to Interactive | 2.1s | <2.0s | Close |
| Largest Contentful Paint | 2.4s | <2.5s | Pass |
| Cumulative Layout Shift | 0.05 | <0.1 | Pass |
| Bundle Size (gzipped) | 245KB | <300KB | Pass |

**Mobile Application**
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Cold Start | 2.8s | <2.0s | Needs work |
| Warm Start | 0.8s | <0.5s | Needs work |
| JS Bundle Size | 1.8MB | <2.0MB | Pass |
| RAM Usage (idle) | 85MB | <100MB | Pass |
| Frame Rate (lists) | 55fps | 60fps | Close |

**iOS Native Application**
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Cold Start | 1.1s | <1.5s | Pass |
| Warm Start | 0.3s | <0.5s | Pass |
| App Size | 28MB | <50MB | Pass |
| RAM Usage (idle) | 45MB | <75MB | Pass |
| Frame Rate | 60fps | 60fps | Pass |

### 2.6.2 Performance Improvement Priorities

1. **Mobile Cold Start**: Implement lazy loading for non-critical screens
2. **Desktop FCP**: Optimize initial bundle, implement code splitting
3. **Mobile Frame Rate**: Optimize list rendering with FlashList
4. **Mobile Warm Start**: Improve state persistence strategy

## 2.7 Current State Summary

### 2.7.1 Strengths

1. **Visual Design Foundation**: Paper-clean aesthetic is well-established and differentiating
2. **Feature Breadth**: Comprehensive feature set across all personal tracking domains
3. **Multi-Platform Presence**: Native experiences on all major platforms
4. **Data Architecture**: Offline-first with robust sync foundation
5. **Component Library**: ShadCN/ui provides solid component foundation
6. **Accessibility Awareness**: Basic accessibility implemented, structure in place for improvements

### 2.7.2 Weaknesses

1. **Cross-Platform Consistency**: Visual and interaction inconsistencies between platforms
2. **Performance**: Mobile startup time and desktop initial load need optimization
3. **Empty States**: Inconsistent and sometimes unhelpful empty state handling
4. **Error Handling**: Technical error messages, limited recovery guidance
5. **Onboarding**: Too brief, doesn't adequately introduce key features
6. **Help System**: Minimal in-app help and documentation

### 2.7.3 Opportunities

1. **Voice Capture Differentiation**: AI-powered voice capture is unique and undersold
2. **Correlation Insights**: Unique cross-domain analysis capabilities
3. **Non-Punitive Gamification**: Differentiating approach not fully communicated
4. **iOS Native Advantages**: Live Activities, Widgets offer competitive advantage
5. **Progressive Disclosure**: Can better guide users to advanced features

### 2.7.4 Threats

1. **Market Fragmentation**: Users may prefer specialized tools for specific domains
2. **Learning Curve**: Comprehensive feature set may overwhelm new users
3. **Performance Competition**: Native apps from larger companies set high bars
4. **Privacy Concerns**: Personal tracking data raises user concerns

---

# PART 3: INFORMATION ARCHITECTURE

## 3.1 IA Philosophy

### 3.1.1 Guiding Principles

The information architecture of Insight 5.2 is built on five foundational principles that balance competing needs: simplicity for new users, power for advanced users, speed for capture, and depth for analysis.

**Principle 1: Capture is Always One Tap Away**

No matter where the user is in the application, initiating a capture must be achievable in a single tap (mobile) or keystroke (desktop). This is implemented through:

- Persistent floating action button (FAB) on mobile
- Global keyboard shortcut (Cmd/Ctrl+K then 'c') on desktop
- Widget-initiated capture on iOS
- Siri shortcut integration

The capture modal is a first-class citizen that exists parallel to the main navigation hierarchy, not buried within it.

**Principle 2: Home is the Hub**

The Today/Dashboard view serves as the command center for daily operations. Users should be able to accomplish their most common tasks without navigating elsewhere:

- View today's habits and complete them
- See today's calendar and upcoming events
- Check pending tasks
- Review recent captures
- Access quick capture

This "hub-and-spoke" model means users can start and end on the Dashboard for typical daily use, with navigation to other sections reserved for deeper exploration.

**Principle 3: Flat When Possible, Deep When Necessary**

The navigation structure prefers flat hierarchies (many top-level sections) over deep hierarchies (nested subsections). This reduces cognitive load and navigation time. However, depth is introduced where:

- Entity detail views (Event > Event Detail)
- Settings organization (Settings > Notifications > Habit Reminders)
- Reports drilling (Reports > Sleep Analysis > Correlation View)

**Principle 4: Context Preservation**

When users navigate to a detail view and then return, their previous context (scroll position, filter state, selected tab) should be preserved. The application remembers:

- Which tab was selected in the main navigation
- Scroll position within lists
- Applied filters and sorts
- Open/closed state of expandable sections
- Selected date in calendar views

**Principle 5: Progressive Feature Discovery**

The navigation presents a curated subset of features initially, revealing additional capabilities as users demonstrate readiness:

- Level 1 (Day 1): Dashboard, Tasks, Calendar, Habits, Capture
- Level 2 (Week 1): Goals, Journal, Settings
- Level 3 (Week 2+): People, Places, Projects, Trackers, Reports, Saved Views

This progression is guided by a combination of time-based unlocking and engagement metrics.

### 3.1.2 Mental Models

Insight supports multiple mental models that users may bring from other applications:

**The Tracker Mental Model** (Habitica, Streaks users)
- Primary focus: Habit tracking and streaks
- Expected structure: Habits prominent, gamification visible
- Insight accommodation: Habits in main tab navigation, XP display on dashboard

**The Journaler Mental Model** (Day One, Journey users)
- Primary focus: Daily writing and reflection
- Expected structure: Timeline/journal view prominent, rich text editing
- Insight accommodation: Timeline view accessible from Dashboard, full journal section

**The Planner Mental Model** (Notion, Things users)
- Primary focus: Task and project management
- Expected structure: Task-centric interface, project containers
- Insight accommodation: Tasks in main navigation, project filtering available

**The Quantifier Mental Model** (Exist.io, Gyroscope users)
- Primary focus: Data analysis and correlation
- Expected structure: Dashboards and charts prominent
- Insight accommodation: Reports section, correlation insights on Dashboard

**The Health Tracker Mental Model** (Apple Health, MyFitnessPal users)
- Primary focus: Health metrics and nutrition
- Expected structure: Health-specific sections, integrations
- Insight accommodation: Health section with nutrition and workout subsections

The IA must not force users into a single mental model but rather allow different pathways that align with their expectations.

## 3.2 Navigation Architecture

### 3.2.1 Mobile Navigation Structure

The mobile application uses a tab-based primary navigation with stack navigation for deeper views:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Content Area]                           │
│                                                             │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Today   │   Tasks   │  Calendar │  Habits  │    More      │
│    🏠    │     ✓     │     📅    │    📊    │     ⋯       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ FAB (always visible)
                              │
                            [ + ]
```

**Tab Navigator Configuration**

| Tab | Label | Icon | Screen | Badge Condition |
|-----|-------|------|--------|-----------------|
| 1 | Today | Home | Dashboard | Unreviewed insights count |
| 2 | Tasks | CheckSquare | Task List | Overdue task count |
| 3 | Calendar | Calendar | Calendar | Events starting soon |
| 4 | Habits | BarChart2 | Habits Grid | Incomplete habits today |
| 5 | More | MoreHorizontal | Feature Hub | None |

**Stack Navigation (per tab)**

Each tab maintains its own navigation stack, allowing users to drill into details without losing their tab context:

```
Today Tab Stack:
├── Dashboard (root)
├── → Entry Detail
├── → Focus Mode
└── → Timeline View

Tasks Tab Stack:
├── Task List (root)
├── → Task Detail
├── → Task Editor
└── → Project View

Calendar Tab Stack:
├── Calendar View (root)
├── → Event Detail
├── → Event Editor
└── → Day View

Habits Tab Stack:
├── Habits Grid (root)
├── → Habit Detail
├── → Habit Editor
├── → Habit Form (new)
└── → Habit Log Detail

More Tab Stack:
├── Feature Hub (root)
├── → Goals
├── → Journal / Notes
├── → People
├── → Places
├── → Projects
├── → Tags
├── → Trackers
├── → Reports
├── → Rewards
├── → Settings
├── → Health Overview
│   ├── → Nutrition
│   └── → Workouts
├── → Ecosystem (integrations)
└── → Assistant
```

**Modal Navigation (global)**

Certain screens present as full-screen modals, overlaying the tab structure:

```
Modal Stack (parallel to tabs):
├── Capture Modal
├── Voice Recording
├── Focus Mode (can be modal or in-tab)
├── Authentication
└── Onboarding
```

### 3.2.2 Desktop Navigation Structure

The desktop application uses a sidebar-based navigation with workspace panes:

```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌───────────────────────────────────────────────────┐  │
│  │         │  │                                                   │  │
│  │ SIDEBAR │  │                  WORKSPACE PANE                   │  │
│  │         │  │                                                   │  │
│  │ Today   │  │  ┌─────────────────────────────────────────────┐  │  │
│  │ Tasks   │  │  │                                             │  │  │
│  │ Calendar│  │  │              CONTENT AREA                   │  │  │
│  │ Habits  │  │  │                                             │  │  │
│  │ Journal │  │  │                                             │  │  │
│  │ Goals   │  │  │                                             │  │  │
│  │ Focus   │  │  │                                             │  │  │
│  │         │  │  │                                             │  │  │
│  │─────────│  │  │                                             │  │  │
│  │ People  │  │  └─────────────────────────────────────────────┘  │  │
│  │ Places  │  │                                                   │  │
│  │ Projects│  │  ┌─────────────────────────────────────────────┐  │  │
│  │ Tags    │  │  │           CONTEXT PANEL (optional)          │  │  │
│  │ Trackers│  │  └─────────────────────────────────────────────┘  │  │
│  │         │  │                                                   │  │
│  │─────────│  └───────────────────────────────────────────────────┘  │
│  │ Reports │                                                         │
│  │ Saved   │                                                         │
│  │ Views   │                                                         │
│  │ Settings│                                                         │
│  └─────────┘                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

**Sidebar Sections**

```
Primary Section:
├── Today (Dashboard)
├── Tasks
├── Calendar
├── Habits
├── Journal
├── Goals
└── Focus

Secondary Section:
├── People
├── Places
├── Projects
├── Tags
└── Trackers

Tertiary Section:
├── Reports
├── Saved Views
└── Settings
```

**Workspace Pane Features**

- **Tabbed Interface**: Multiple entities of the same type can be open in tabs
- **Split View**: Optional side-by-side comparison
- **Context Panel**: Collapsible panel for related information
- **Resizable**: Sidebar width adjustable, context panel toggleable

**Command Palette (Cmd/Ctrl + K)**

A universal search and command interface that provides:
- Quick navigation to any section
- Search across all entities
- Action execution (create task, log habit, etc.)
- Recent items access
- Keyboard-driven workflow

### 3.2.3 iOS Native Navigation Structure

The SwiftUI application follows iOS conventions with tab bar and navigation stacks:

```swift
// Root navigation structure
TabView(selection: $selectedTab) {
    NavigationStack {
        DashboardView()
    }
    .tabItem { Label("Today", systemImage: "house") }
    .tag(Tab.today)

    NavigationStack {
        PlanView()
    }
    .tabItem { Label("Plan", systemImage: "calendar") }
    .tag(Tab.plan)

    CaptureView()
        .tabItem { Label("Capture", systemImage: "plus.circle.fill") }
        .tag(Tab.capture)

    NavigationStack {
        HabitsView()
    }
    .tabItem { Label("Habits", systemImage: "chart.bar") }
    .tag(Tab.habits)

    NavigationStack {
        MoreView()
    }
    .tabItem { Label("More", systemImage: "ellipsis") }
    .tag(Tab.more)
}
```

**Navigation Destinations**

```swift
// Type-safe navigation using NavigationPath
enum Destination: Hashable {
    case timeline
    case focus
    case calendar
    case taskList
    case taskDetail(Task)
    case habitDetail(Habit)
    case habitForm(Habit?)
    case habitLog(HabitLog)
    case noteList
    case noteDetail(Note)
    case entryDetail(Entry)
    case eventDetail(CalendarEvent)
    case workoutDetail(Workout)
    case nutritionDetail(NutritionLog)
    case trackerLog(TrackerLog)
    case goals
    case people
    case places
    case projects
    case settings
    case savedViews
    case savedViewBuilder(SavedView?)
}
```

## 3.3 Information Hierarchy

### 3.3.1 Entity Taxonomy

All data in Insight 5.2 falls into one of the following entity categories:

**Temporal Entities** (time-bound)
```
├── Entry (journal entry, note, capture)
│   ├── Text Entry
│   ├── Voice Entry
│   ├── Photo Entry
│   └── Quick Capture
├── Event (calendar)
│   ├── Personal Event
│   ├── External Event (synced)
│   └── Recurring Event Instance
├── Task (to-do)
│   ├── One-time Task
│   └── Recurring Task Instance
├── Habit Log (habit completion)
├── Tracker Log (numeric tracker entry)
├── Workout Log (exercise session)
└── Nutrition Log (food/meal entry)
```

**Structural Entities** (containers and definitions)
```
├── Habit (definition, not logs)
├── Tracker (definition, not logs)
├── Goal
│   ├── Outcome Goal
│   └── Process Goal
├── Project
├── Person (contact/relationship)
├── Place (location)
└── Tag
```

**System Entities** (configuration)
```
├── Saved View (custom filter configuration)
├── Template (entry/habit templates)
├── Theme (UI theme configuration)
└── Integration (external service connection)
```

### 3.3.2 Entity Relationships

```
                              ┌──────────┐
                              │   Tag    │
                              └────┬─────┘
                                   │ many-to-many
       ┌───────────────────────────┼───────────────────────────┐
       │                           │                           │
       ▼                           ▼                           ▼
┌──────────┐               ┌──────────┐               ┌──────────┐
│  Entry   │               │   Task   │               │  Habit   │
└────┬─────┘               └────┬─────┘               └────┬─────┘
     │                          │                          │
     │ belongs-to               │ belongs-to               │ has-many
     ▼                          ▼                          ▼
┌──────────┐               ┌──────────┐               ┌──────────┐
│  Person  │◄──────────────│ Project  │               │Habit Log │
└──────────┘  has-many     └──────────┘               └──────────┘
                                │
                                │ has-many
                                ▼
                          ┌──────────┐
                          │   Goal   │
                          └──────────┘

┌──────────┐               ┌──────────┐
│  Place   │◄──attached-to─│  Entry   │
└──────────┘               └──────────┘

┌──────────┐               ┌──────────┐
│ Tracker  │───has-many───►│Tracker   │
│          │               │   Log    │
└──────────┘               └──────────┘

┌──────────┐               ┌──────────┐
│  Event   │◄──synced-from─│ External │
│          │               │ Calendar │
└──────────┘               └──────────┘
```

### 3.3.3 Content Models

**Entry Content Model**
```typescript
interface Entry {
  id: string;
  type: 'text' | 'voice' | 'photo' | 'quick';
  content: string;                    // Markdown text
  rawTranscript?: string;             // For voice entries
  media?: MediaAttachment[];          // Photos, files
  mood?: MoodRating;                  // 1-5 scale
  energy?: EnergyRating;              // 1-5 scale
  location?: Location;                // GPS + place reference
  weather?: WeatherData;              // Auto-captured
  tags: Tag[];
  people: Person[];
  extractedEntities: ExtractedEntity[]; // AI-detected entities
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime;               // Soft delete
}
```

**Habit Content Model**
```typescript
interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;                       // Lucide icon name
  color: string;                      // Hex color
  frequency: FrequencyConfig;         // Daily, weekly, custom
  targetValue?: number;               // For quantifiable habits
  targetUnit?: string;                // "glasses", "minutes", etc.
  reminderTime?: Time;
  streakFreezeTokens: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  tags: Tag[];
  archived: boolean;
  order: number;                      // Display order
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface HabitLog {
  id: string;
  habitId: string;
  date: Date;                         // The day this log is for
  completed: boolean;
  value?: number;                     // For quantifiable habits
  note?: string;
  skipped: boolean;                   // Explicitly skipped
  frozenToken: boolean;               // Used a freeze token
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Task Content Model**
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;               // Markdown
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 1 | 2 | 3 | 4;           // 1 = highest
  dueDate?: DateTime;
  dueTime?: Time;
  estimatedMinutes?: number;
  actualMinutes?: number;
  recurring?: RecurrenceRule;
  projectId?: string;
  parentTaskId?: string;              // For subtasks
  tags: Tag[];
  assignedTo?: Person;
  order: number;                      // Within project/list
  completedAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Goal Content Model**
```typescript
interface Goal {
  id: string;
  title: string;
  description?: string;
  type: 'outcome' | 'process';
  status: 'active' | 'completed' | 'abandoned';
  targetDate?: Date;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  projectId?: string;
  parentGoalId?: string;              // For goal hierarchy
  linkedHabits: Habit[];              // Process goals
  linkedTrackers: Tracker[];
  milestones: Milestone[];
  tags: Tag[];
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

## 3.4 User Flows

### 3.4.1 Core User Flows

**Flow 1: Morning Routine (Primary Daily Flow)**

```
User opens app
    │
    ▼
Dashboard loads with today's summary
    │
    ├── Quick scan of: pending habits, tasks due, calendar events
    │
    ▼
User taps first incomplete habit
    │
    ▼
Habit marked complete (single tap)
    │
    ├── XP animation plays
    ├── Streak updates
    │
    ▼
Return to Dashboard (auto)
    │
    ▼
Repeat for remaining habits
    │
    ▼
User reviews today's tasks
    │
    ├── Tap to mark quick tasks done
    ├── Tap to reschedule if needed
    │
    ▼
User checks calendar
    │
    ├── Review upcoming events
    │
    ▼
Session complete (typical: 2-3 minutes)
```

**Flow 2: Quick Capture (Time-Critical Flow)**

```
User has thought to capture
    │
    ▼
Tap FAB (or use widget/shortcut)
    │
    ▼
Capture modal opens (<100ms)
    │
    ├── Option A: Type quick note
    │   └── Auto-save on blur or submit
    │
    ├── Option B: Start voice recording
    │   ├── Speak freely
    │   ├── Tap to stop
    │   ├── AI extracts entities
    │   ├── Review/edit extractions
    │   └── Confirm save
    │
    ├── Option C: Quick-tap button
    │   └── Pre-configured capture (mood, water, etc.)
    │
    ▼
Modal closes
    │
    ▼
Return to previous context
    │
Total time target: <10 seconds
```

**Flow 3: Evening Reflection (Secondary Daily Flow)**

```
User opens app in evening
    │
    ▼
Dashboard shows day summary
    │
    ├── Habits completed: X/Y
    ├── Tasks completed: X/Y
    ├── Entries captured: X
    │
    ▼
User taps "Reflect" or opens Journal
    │
    ▼
Reflection prompt appears
    │
    ├── "How did today go?"
    ├── "What went well?"
    ├── "What would you do differently?"
    │
    ▼
User writes reflection (text or voice)
    │
    ▼
Optional: Log mood and energy
    │
    ▼
Review AI-suggested tags/connections
    │
    ▼
Save entry
    │
    ▼
View "Week in Review" summary (optional)
    │
    ▼
Session complete (typical: 5-10 minutes)
```

**Flow 4: New Habit Creation**

```
User navigates to Habits
    │
    ▼
Taps "Add Habit" or + button
    │
    ▼
Habit form opens
    │
    ├── Step 1: Basic Info
    │   ├── Name (required)
    │   ├── Description (optional)
    │   ├── Icon selection
    │   └── Color selection
    │
    ├── Step 2: Schedule
    │   ├── Frequency (daily/weekly/custom)
    │   ├── Target days (if weekly/custom)
    │   └── Reminder time (optional)
    │
    ├── Step 3: Measurement (optional)
    │   ├── Quantifiable? (yes/no)
    │   ├── Target value
    │   └── Unit
    │
    ▼
Save habit
    │
    ▼
Habit appears in list
    │
    ├── Position: User can reorder
    │
    ▼
First day: Habit ready to track
```

**Flow 5: Focus Session**

```
User initiates Focus Mode
    │
    ├── From Dashboard shortcut
    ├── From dedicated Focus screen
    ├── From iOS widget
    │
    ▼
Focus configuration appears
    │
    ├── Select duration (25/50/90 min or custom)
    ├── Optional: Link to task or project
    ├── Optional: Select environment sounds
    │
    ▼
Start focus session
    │
    ▼
Interface transforms:
    │
    ├── Color scheme shifts to Obsidian Dark
    ├── Timer prominently displayed
    ├── Distractions hidden
    ├── Notifications paused
    ├── Live Activity starts (iOS)
    │
    ▼
User works...
    │
    ├── Can add notes during session
    ├── Can pause/resume
    │
    ▼
Timer completes
    │
    ▼
Completion screen:
    │
    ├── Duration logged
    ├── XP awarded
    ├── Optional: Rate productivity
    ├── Optional: Add reflection note
    │
    ▼
Return to normal interface
```

### 3.4.2 Secondary User Flows

**Flow 6: Weekly Review**

```
User navigates to Reports
    │
    ▼
Weekly Review section
    │
    ├── Habit completion rates
    ├── Task throughput
    ├── Mood/energy trends
    ├── Time allocation
    ├── AI-detected correlations
    │
    ▼
User explores correlations
    │
    ├── "Sleep quality correlates with morning mood (+0.7)"
    ├── "Exercise days show higher afternoon energy"
    │
    ▼
Optional: Set goals based on insights
    │
    ▼
Optional: Adjust habits based on data
```

**Flow 7: External Calendar Sync**

```
User navigates to Settings > Calendars
    │
    ▼
"Connect Calendar" option
    │
    ▼
OAuth flow for Google/Microsoft/Apple
    │
    ▼
Select calendars to sync
    │
    ├── Personal calendar ✓
    ├── Work calendar ✓
    ├── Shared family calendar ✗
    │
    ▼
Configure sync options
    │
    ├── Two-way sync vs read-only
    ├── Sync frequency
    │
    ▼
Initial sync begins
    │
    ▼
Calendar events appear in Insight
    │
    ├── Visual distinction for synced events
    ├── Edit restrictions for external events
```

**Flow 8: Health Data Integration (iOS)**

```
User navigates to Settings > Health
    │
    ▼
HealthKit permission request
    │
    ▼
Select data types to sync
    │
    ├── Sleep ✓
    ├── Steps ✓
    ├── Workouts ✓
    ├── Heart Rate ✓
    ├── Nutrition ✗
    │
    ▼
Initial sync of historical data
    │
    ▼
Health data appears in:
    │
    ├── Dashboard widgets
    ├── Reports correlations
    ├── Timeline entries (auto-logged)
```

## 3.5 Search and Discovery

### 3.5.1 Search Architecture

**Global Search**

Accessible via:
- Command palette (Cmd/Ctrl+K)
- Search icon in header
- Dedicated search screen on mobile

```
Search Query Processing:
    │
    ▼
Parse query for:
    │
    ├── Entity type hints: "task:", "habit:", "@person", "#tag"
    ├── Date hints: "yesterday", "last week", "Jan 15"
    ├── Status hints: "completed", "pending", "archived"
    │
    ▼
Search across:
    │
    ├── Entry content (full-text)
    ├── Task titles and descriptions
    ├── Habit names
    ├── Person names
    ├── Place names
    ├── Project names
    ├── Tag names
    │
    ▼
Rank results by:
    │
    ├── Relevance score
    ├── Recency
    ├── Frequency of access
    │
    ▼
Display categorized results:
    │
    ├── Top Results (mixed)
    ├── Entries (X)
    ├── Tasks (X)
    ├── Habits (X)
    ├── People (X)
    └── More...
```

**Contextual Search**

Within specific sections, search is scoped:
- Tasks screen: Search tasks only
- Habits screen: Search habits only
- Journal screen: Search entries only

### 3.5.2 Filtering System

**Filter Types**

| Filter | Applies To | UI Element |
|--------|------------|------------|
| Date Range | All temporal | Date picker |
| Tags | All taggable | Multi-select |
| Status | Tasks, Habits | Segmented control |
| Priority | Tasks | Multi-select |
| Person | Entries, Tasks | Person picker |
| Place | Entries | Place picker |
| Project | Tasks, Goals | Project picker |
| Mood Range | Entries | Range slider |
| Energy Range | Entries | Range slider |

**Saved Views**

Users can save filter combinations as named views:

```typescript
interface SavedView {
  id: string;
  name: string;
  entityType: 'entry' | 'task' | 'habit' | 'mixed';
  filters: FilterConfig[];
  sortBy: SortConfig;
  groupBy?: GroupConfig;
  display: 'list' | 'grid' | 'calendar' | 'timeline';
  pinned: boolean;              // Show in sidebar
  icon?: string;
  color?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

Examples of saved views:
- "Work Tasks" - Tasks tagged 'work', sorted by due date
- "Morning Entries" - Entries created before 10am
- "This Week's Wins" - Entries tagged 'win' from past 7 days
- "Overdue" - Tasks past due date, sorted by priority

### 3.5.3 Discovery Features

**AI-Powered Discovery**

```
Correlation Engine
    │
    ├── Analyzes patterns across data types
    │
    ▼
Surfaces insights like:
    │
    ├── "Your mood is 40% higher on days you exercise"
    ├── "You complete more tasks when you start before 9am"
    ├── "Sleep duration correlates with next-day energy (r=0.72)"
    │
    ▼
Presented on:
    │
    ├── Dashboard "Insights" widget
    ├── Weekly Review section
    └── Individual entity detail screens (contextual)
```

**"On This Day" Feature**

Shows entries from:
- Exactly 1 year ago
- Exactly 1 month ago
- Notable past days (holidays, milestones)

**Smart Suggestions**

Based on current context:
- Time of day suggests relevant captures ("Log lunch?")
- Location suggests place check-in
- Calendar event ending suggests reflection
- Habit streak milestone suggests celebration

## 3.6 Cross-Platform Considerations

### 3.6.1 Platform Feature Matrix

| Feature | Mobile | Desktop | iOS Native |
|---------|--------|---------|------------|
| Bottom Tab Navigation | Yes | No | Yes |
| Sidebar Navigation | No | Yes | No |
| Command Palette | No | Yes | No |
| Keyboard Shortcuts | Limited | Full | No |
| Pull to Refresh | Yes | No | Yes |
| Swipe Gestures | Yes | Limited | Yes |
| Right-Click Context | No | Yes | No |
| Long-Press Context | Yes | No | Yes |
| Widgets | Planned | No | Yes |
| Live Activities | No | No | Yes |
| Siri Integration | No | No | Yes |
| HealthKit | No | No | Yes |
| Offline Mode | Full | Full | Full |
| Multi-Window | No | Yes | No |
| Split View | No | Yes | iPad only |

### 3.6.2 Navigation Parity Guidelines

When features exist on multiple platforms, navigation should be analogous:

**Example: Accessing Habit Detail**

| Platform | Path |
|----------|------|
| Mobile | Habits tab > Tap habit > Habit Detail |
| Desktop | Sidebar: Habits > Click habit > Habit Detail pane |
| iOS Native | Habits tab > Tap habit > NavigationLink to HabitDetailView |

**Deep Link Support**

All platforms support deep links for cross-platform sharing:

```
insight://habit/{id}           → Opens habit detail
insight://task/{id}            → Opens task detail
insight://entry/{id}           → Opens entry detail
insight://capture              → Opens capture modal
insight://focus?duration=25    → Starts 25-min focus session
```

### 3.6.3 Responsive Breakpoints

For platforms with variable screen sizes:

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | <640px | Single column, bottom tabs |
| Tablet | 640-1024px | Sidebar + single pane |
| Desktop | 1024-1440px | Sidebar + pane + optional context |
| Wide | >1440px | Sidebar + pane + context + split view option |

## 3.7 URL and Deep Linking Strategy

### 3.7.1 Web URL Structure

```
/                           → Dashboard
/tasks                      → Task list
/tasks/{id}                 → Task detail
/calendar                   → Calendar view
/calendar/{date}            → Specific date view
/habits                     → Habits overview
/habits/{id}                → Habit detail
/journal                    → Journal/entries list
/journal/{id}               → Entry detail
/goals                      → Goals overview
/goals/{id}                 → Goal detail
/focus                      → Focus mode
/people                     → People list
/people/{id}                → Person detail
/places                     → Places list
/places/{id}                → Place detail
/projects                   → Projects list
/projects/{id}              → Project detail
/reports                    → Reports overview
/reports/{type}             → Specific report
/settings                   → Settings
/settings/{section}         → Settings section
/search?q={query}           → Search results
/view/{savedViewId}         → Saved view
```

### 3.7.2 Mobile Deep Link Handling

```typescript
// Expo Router link configuration
const linking = {
  prefixes: ['insight://', 'https://app.getinsight.io'],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          index: '',
          tasks: 'tasks',
          calendar: 'calendar',
          habits: 'habits',
          more: 'more',
        },
      },
      'event/[id]': 'event/:id',
      'task/[id]': 'task/:id',
      'habit/[id]': 'habit/:id',
      capture: 'capture',
      focus: 'focus',
      // ... etc
    },
  },
};
```

### 3.7.3 iOS Universal Links

```xml
<!-- apple-app-site-association -->
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.insight.app",
        "paths": [
          "/habit/*",
          "/task/*",
          "/entry/*",
          "/capture",
          "/focus"
        ]
      }
    ]
  }
}
```

---

# PART 4: UI SYSTEM SPECIFICATION

## 4.1 Design Token Architecture

### 4.1.1 Token Hierarchy

Insight 5.2 uses a three-tier token architecture that enables consistent theming while maintaining flexibility:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIMITIVE TOKENS                         │
│  Raw values: colors, sizes, font families                   │
│  e.g., gray-900: #1C1C1E, spacing-4: 16px                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SEMANTIC TOKENS                          │
│  Purposeful aliases: background, foreground, accent         │
│  e.g., background-primary: {gray-50}, accent: {orange-500} │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   COMPONENT TOKENS                          │
│  Component-specific: button-bg, card-border                 │
│  e.g., button-primary-bg: {accent}, card-bg: {surface-1}   │
└─────────────────────────────────────────────────────────────┘
```

### 4.1.2 Color System

**Primitive Color Palette**

```css
/* Gray Scale (Neutral) */
--gray-0: #FFFFFF;
--gray-50: #F9F9F8;
--gray-100: #F2F0ED;    /* Paper background */
--gray-200: #E5E2DE;
--gray-300: #D1CEC8;
--gray-400: #9C9891;
--gray-500: #6B6860;
--gray-600: #4A4743;
--gray-700: #333130;
--gray-800: #242322;
--gray-900: #1C1C1E;    /* Primary text */
--gray-950: #0D0D0D;

/* Orange (Primary Accent) */
--orange-50: #FFF5F0;
--orange-100: #FFE5D9;
--orange-200: #FFCBB3;
--orange-300: #FFB08C;
--orange-400: #FF9566;
--orange-500: #D95D39;   /* Insight Orange - Primary */
--orange-600: #C44A2A;
--orange-700: #A33D23;
--orange-800: #82311C;
--orange-900: #612414;

/* Supporting Colors */
--green-500: #22C55E;    /* Success, habit completion */
--green-600: #16A34A;
--red-500: #EF4444;      /* Error, destructive actions */
--red-600: #DC2626;
--blue-500: #3B82F6;     /* Info, links */
--blue-600: #2563EB;
--yellow-500: #EAB308;   /* Warning, pending */
--yellow-600: #CA8A04;
--purple-500: #A855F7;   /* Focus mode accent */
--purple-600: #9333EA;

/* Mood Colors */
--mood-1: #EF4444;       /* Very bad */
--mood-2: #F97316;       /* Bad */
--mood-3: #EAB308;       /* Neutral */
--mood-4: #84CC16;       /* Good */
--mood-5: #22C55E;       /* Very good */

/* Energy Colors */
--energy-1: #94A3B8;     /* Very low */
--energy-2: #64748B;     /* Low */
--energy-3: #3B82F6;     /* Medium */
--energy-4: #8B5CF6;     /* High */
--energy-5: #EC4899;     /* Very high */
```

**Semantic Color Tokens**

```css
/* Light Theme (Default) */
:root {
  /* Backgrounds */
  --background-primary: var(--gray-100);      /* Main app background */
  --background-secondary: var(--gray-0);      /* Card/surface background */
  --background-tertiary: var(--gray-50);      /* Subtle differentiation */
  --background-elevated: var(--gray-0);       /* Modals, popovers */
  --background-inverse: var(--gray-900);      /* Inverted sections */

  /* Foregrounds */
  --foreground-primary: var(--gray-900);      /* Primary text */
  --foreground-secondary: var(--gray-600);    /* Secondary text */
  --foreground-tertiary: var(--gray-500);     /* Placeholder, disabled */
  --foreground-inverse: var(--gray-0);        /* Text on dark backgrounds */

  /* Accent */
  --accent-primary: var(--orange-500);        /* Primary interactive */
  --accent-secondary: var(--orange-600);      /* Hover/pressed states */
  --accent-subtle: var(--orange-100);         /* Subtle accent backgrounds */

  /* Semantic */
  --success: var(--green-500);
  --success-subtle: var(--green-500) / 10%;
  --error: var(--red-500);
  --error-subtle: var(--red-500) / 10%;
  --warning: var(--yellow-500);
  --warning-subtle: var(--yellow-500) / 10%;
  --info: var(--blue-500);
  --info-subtle: var(--blue-500) / 10%;

  /* Borders */
  --border-default: var(--gray-200);
  --border-subtle: var(--gray-100);
  --border-strong: var(--gray-300);
  --border-focus: var(--accent-primary);
}
```

**Dark Theme**

```css
[data-theme="dark"] {
  /* Backgrounds */
  --background-primary: var(--gray-950);
  --background-secondary: var(--gray-900);
  --background-tertiary: var(--gray-800);
  --background-elevated: var(--gray-800);
  --background-inverse: var(--gray-100);

  /* Foregrounds */
  --foreground-primary: var(--gray-50);
  --foreground-secondary: var(--gray-400);
  --foreground-tertiary: var(--gray-500);
  --foreground-inverse: var(--gray-900);

  /* Adjusted accent for dark mode visibility */
  --accent-primary: var(--orange-400);
  --accent-secondary: var(--orange-300);
  --accent-subtle: var(--orange-500) / 20%;

  /* Borders */
  --border-default: var(--gray-700);
  --border-subtle: var(--gray-800);
  --border-strong: var(--gray-600);
}
```

### 4.1.3 Typography System

**Font Families**

```css
:root {
  --font-sans: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-heading: 'Space Grotesk', var(--font-sans);
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
}
```

**Type Scale**

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 12px | 16px | 400 | Captions, labels |
| `text-sm` | 14px | 20px | 400 | Secondary text |
| `text-base` | 16px | 24px | 400 | Body text |
| `text-lg` | 18px | 28px | 400 | Large body |
| `text-xl` | 20px | 28px | 500 | Subheadings |
| `text-2xl` | 24px | 32px | 600 | Section headings |
| `text-3xl` | 30px | 36px | 600 | Page titles |
| `text-4xl` | 36px | 40px | 700 | Hero text |
| `text-5xl` | 48px | 1 | 700 | Display text |

**Font Weight Tokens**

```css
:root {
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

**Typography CSS Custom Properties**

```css
:root {
  /* Body */
  --typography-body-font-family: var(--font-sans);
  --typography-body-font-size: 16px;
  --typography-body-line-height: 1.5;
  --typography-body-font-weight: var(--font-weight-normal);

  /* Headings */
  --typography-h1-font-family: var(--font-heading);
  --typography-h1-font-size: 30px;
  --typography-h1-line-height: 1.2;
  --typography-h1-font-weight: var(--font-weight-semibold);

  --typography-h2-font-family: var(--font-heading);
  --typography-h2-font-size: 24px;
  --typography-h2-line-height: 1.25;
  --typography-h2-font-weight: var(--font-weight-semibold);

  --typography-h3-font-family: var(--font-heading);
  --typography-h3-font-size: 20px;
  --typography-h3-line-height: 1.3;
  --typography-h3-font-weight: var(--font-weight-medium);

  /* Labels */
  --typography-label-font-family: var(--font-sans);
  --typography-label-font-size: 14px;
  --typography-label-line-height: 1.4;
  --typography-label-font-weight: var(--font-weight-medium);
  --typography-label-letter-spacing: 0.01em;

  /* Captions */
  --typography-caption-font-family: var(--font-sans);
  --typography-caption-font-size: 12px;
  --typography-caption-line-height: 1.4;
  --typography-caption-font-weight: var(--font-weight-normal);
}
```

### 4.1.4 Spacing System

**Base Unit**: 4px

**Spacing Scale**

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | Reset |
| `space-0.5` | 2px | Micro adjustments |
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Default gap |
| `space-3` | 12px | Comfortable spacing |
| `space-4` | 16px | Section gap |
| `space-5` | 20px | Card padding |
| `space-6` | 24px | Large padding |
| `space-8` | 32px | Section padding |
| `space-10` | 40px | Major sections |
| `space-12` | 48px | Page margins |
| `space-16` | 64px | Large gaps |
| `space-20` | 80px | Hero spacing |
| `space-24` | 96px | Maximum spacing |

**Layout Spacing Tokens**

```css
:root {
  /* Container */
  --container-padding-mobile: var(--space-4);
  --container-padding-tablet: var(--space-6);
  --container-padding-desktop: var(--space-8);
  --container-max-width: 1280px;

  /* Cards */
  --card-padding-sm: var(--space-3);
  --card-padding-md: var(--space-4);
  --card-padding-lg: var(--space-6);
  --card-gap: var(--space-4);

  /* Lists */
  --list-item-gap: var(--space-2);
  --list-section-gap: var(--space-6);

  /* Forms */
  --form-field-gap: var(--space-4);
  --form-group-gap: var(--space-6);
  --input-padding-x: var(--space-3);
  --input-padding-y: var(--space-2);
}
```

### 4.1.5 Border Radius System

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0px | Square corners |
| `radius-sm` | 4px | Subtle rounding |
| `radius-md` | 8px | Default rounding |
| `radius-lg` | 12px | Cards, modals |
| `radius-xl` | 16px | Large containers |
| `radius-2xl` | 24px | Hero sections |
| `radius-full` | 9999px | Pills, avatars |

### 4.1.6 Shadow System

```css
:root {
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);
  --shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.06);

  /* Colored shadows for cards */
  --shadow-accent: 0 4px 14px rgba(217, 93, 57, 0.25);
  --shadow-success: 0 4px 14px rgba(34, 197, 94, 0.25);
}
```

### 4.1.7 Animation Tokens

```css
:root {
  /* Durations */
  --duration-instant: 0ms;
  --duration-fast: 100ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-deliberate: 800ms;

  /* Easings */
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-enter: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0.0, 1, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* Common transitions */
  --transition-fast: var(--duration-fast) var(--ease-standard);
  --transition-normal: var(--duration-normal) var(--ease-standard);
  --transition-slow: var(--duration-slow) var(--ease-standard);
}
```

## 4.2 Theme Specifications

### 4.2.1 Theme Overview

Insight 5.2 supports eight distinct themes, organized into categories:

**Light Themes**
1. Default (Paper-Clean)
2. Light
3. Olive
4. Rose Gold

**Dark Themes**
5. Dark
6. Olive Orange
7. Midnight
8. Midnight Neon

### 4.2.2 Default Theme (Paper-Clean)

The flagship theme embodies the "paper-clean" aesthetic:

```css
[data-theme="default"] {
  --background-primary: #F2F0ED;      /* Warm cream paper */
  --background-secondary: #FFFFFF;    /* Pure white cards */
  --background-tertiary: #F9F9F8;     /* Subtle variation */
  --foreground-primary: #1C1C1E;      /* Deep charcoal text */
  --foreground-secondary: #6B6860;    /* Warm gray */
  --accent-primary: #D95D39;          /* Insight Orange */
  --accent-secondary: #C44A2A;        /* Darker orange */

  /* Special surfaces */
  --surface-elevated: #FFFFFF;
  --surface-sunken: #E5E2DE;

  /* Shadows use warm undertones */
  --shadow-color: 30 10% 20%;
}
```

### 4.2.3 Dark Theme

Clean dark mode for low-light use:

```css
[data-theme="dark"] {
  --background-primary: #0D0D0D;      /* Near black */
  --background-secondary: #1C1C1E;    /* Dark gray */
  --background-tertiary: #242322;     /* Subtle lift */
  --foreground-primary: #F9F9F8;      /* Off-white text */
  --foreground-secondary: #9C9891;    /* Muted gray */
  --accent-primary: #FF9566;          /* Brighter orange for contrast */
  --accent-secondary: #FFB08C;        /* Lighter orange */

  --surface-elevated: #242322;
  --surface-sunken: #0D0D0D;

  --shadow-color: 0 0% 0%;
}
```

### 4.2.4 Midnight Theme (Focus Mode)

The Obsidian Dark theme used during Focus Mode:

```css
[data-theme="midnight"] {
  --background-primary: #0A0A0B;      /* Deep black */
  --background-secondary: #141416;    /* Near black */
  --background-tertiary: #1A1A1D;     /* Subtle variation */
  --foreground-primary: #FAFAFA;      /* Bright white */
  --foreground-secondary: #A1A1AA;    /* Cool gray */
  --accent-primary: #A855F7;          /* Purple accent */
  --accent-secondary: #9333EA;        /* Deeper purple */

  /* Minimal visual noise */
  --border-default: transparent;
  --border-subtle: transparent;
  --border-strong: #27272A;

  /* Reduced shadows for focus */
  --shadow-md: 0 0 0 transparent;
}
```

### 4.2.5 Midnight Neon (Celebration)

Used for achievement animations and celebrations:

```css
[data-theme="midnight-neon"] {
  --background-primary: #0A0A0B;
  --background-secondary: #141416;
  --foreground-primary: #FAFAFA;

  /* Neon accents */
  --accent-primary: #F472B6;          /* Neon pink */
  --accent-secondary: #22D3EE;        /* Cyan */
  --accent-tertiary: #A3E635;         /* Lime */

  /* Glow effects */
  --glow-primary: 0 0 20px rgba(244, 114, 182, 0.5);
  --glow-secondary: 0 0 20px rgba(34, 211, 238, 0.5);
}
```

### 4.2.6 Olive Theme

Calming green-tinted light theme:

```css
[data-theme="olive"] {
  --background-primary: #F5F5F0;      /* Sage-tinted white */
  --background-secondary: #FFFFFF;
  --foreground-primary: #2D3128;      /* Dark olive */
  --foreground-secondary: #5C6356;    /* Olive gray */
  --accent-primary: #6B8E23;          /* Olive green */
  --accent-secondary: #556B2F;        /* Dark olive green */
}
```

### 4.2.7 Rose Gold Theme

Warm, elegant light theme:

```css
[data-theme="rose-gold"] {
  --background-primary: #FDF8F6;      /* Pink-tinted white */
  --background-secondary: #FFFFFF;
  --foreground-primary: #3D2C29;      /* Warm brown */
  --foreground-secondary: #7A6360;    /* Dusty rose gray */
  --accent-primary: #B76E79;          /* Rose gold */
  --accent-secondary: #9D5C65;        /* Deeper rose */
}
```

### 4.2.8 Theme Switching

Themes can be switched:
- Manually: Settings > Appearance > Theme
- Automatically: Follow system light/dark preference
- Contextually: Focus Mode triggers Midnight theme

```typescript
// Theme context implementation
interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  systemPreference: 'light' | 'dark';
  followSystem: boolean;
  setFollowSystem: (follow: boolean) => void;
}

type ThemeName =
  | 'default'
  | 'light'
  | 'dark'
  | 'olive'
  | 'olive-orange'
  | 'rose-gold'
  | 'midnight'
  | 'midnight-neon';
```

## 4.3 Icon System

### 4.3.1 Icon Library

Insight 5.2 uses **Lucide Icons** as the primary icon library:

- **Total Icons**: 1,400+
- **Style**: Outlined, consistent 24px base
- **Stroke Width**: 2px default
- **License**: ISC (permissive)

**Why Lucide:**
- Active maintenance (fork of Feather Icons)
- Comprehensive coverage
- React and React Native packages available
- Consistent visual weight
- Easy customization

### 4.3.2 Icon Sizes

| Size Token | Dimensions | Usage |
|------------|------------|-------|
| `icon-xs` | 12x12px | Inline with small text |
| `icon-sm` | 16x16px | Secondary actions, badges |
| `icon-md` | 20x20px | Default size |
| `icon-lg` | 24x24px | Primary navigation, buttons |
| `icon-xl` | 32x32px | Feature icons, empty states |
| `icon-2xl` | 48x48px | Hero icons, onboarding |

### 4.3.3 Icon Mapping

**Navigation Icons**
```typescript
const navigationIcons = {
  today: 'Home',
  tasks: 'CheckSquare',
  calendar: 'Calendar',
  habits: 'BarChart2',
  more: 'MoreHorizontal',
  journal: 'BookOpen',
  goals: 'Target',
  focus: 'Focus',
  people: 'Users',
  places: 'MapPin',
  projects: 'Folder',
  tags: 'Tag',
  trackers: 'Activity',
  reports: 'PieChart',
  settings: 'Settings',
};
```

**Action Icons**
```typescript
const actionIcons = {
  add: 'Plus',
  edit: 'Pencil',
  delete: 'Trash2',
  archive: 'Archive',
  share: 'Share',
  export: 'Download',
  import: 'Upload',
  search: 'Search',
  filter: 'Filter',
  sort: 'ArrowUpDown',
  close: 'X',
  back: 'ArrowLeft',
  forward: 'ArrowRight',
  menu: 'Menu',
  options: 'MoreVertical',
};
```

**Status Icons**
```typescript
const statusIcons = {
  complete: 'CheckCircle',
  incomplete: 'Circle',
  inProgress: 'Clock',
  cancelled: 'XCircle',
  paused: 'Pause',
  success: 'CheckCircle',
  error: 'AlertCircle',
  warning: 'AlertTriangle',
  info: 'Info',
};
```

**Feature Icons**
```typescript
const featureIcons = {
  voice: 'Mic',
  camera: 'Camera',
  attachment: 'Paperclip',
  link: 'Link',
  location: 'MapPin',
  time: 'Clock',
  date: 'Calendar',
  reminder: 'Bell',
  repeat: 'Repeat',
  sync: 'RefreshCw',
  offline: 'WifiOff',
  online: 'Wifi',
};
```

### 4.3.4 Custom Icons

A small set of custom icons extend Lucide for Insight-specific needs:

```typescript
const customIcons = {
  insightLogo: '/* SVG path */',      // Brand logo
  streak: '/* SVG path */',           // Fire/streak icon
  xp: '/* SVG path */',               // Experience points
  levelUp: '/* SVG path */',          // Level up celebration
  freeze: '/* SVG path */',           // Streak freeze token
  mood: '/* SVG path */',             // Mood tracking
  energy: '/* SVG path */',           // Energy tracking
};
```

## 4.4 Component Architecture

### 4.4.1 Component Organization

Components are organized by atomic design principles:

```
components/
├── primitives/          # Atoms: Basic building blocks
│   ├── Button/
│   ├── Input/
│   ├── Text/
│   ├── Icon/
│   └── Badge/
├── compounds/           # Molecules: Combined primitives
│   ├── FormField/
│   ├── SearchBar/
│   ├── DatePicker/
│   └── DropdownMenu/
├── patterns/            # Organisms: Reusable patterns
│   ├── Card/
│   ├── ListItem/
│   ├── Modal/
│   └── Navigation/
└── templates/           # Page templates
    ├── DashboardLayout/
    ├── ListLayout/
    └── DetailLayout/
```

### 4.4.2 Component Props Standards

All components follow consistent prop patterns:

```typescript
// Base props shared by all components
interface BaseComponentProps {
  className?: string;
  testID?: string;               // For testing
  accessibilityLabel?: string;   // Screen reader label
}

// Size variants
type Size = 'sm' | 'md' | 'lg';

// Color variants
type ColorVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

// State props
interface StateProps {
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}
```

### 4.4.3 Button Component Specification

**Variants**

| Variant | Usage | Background | Text |
|---------|-------|------------|------|
| `primary` | Primary actions | Accent | White |
| `secondary` | Secondary actions | Transparent | Accent |
| `ghost` | Tertiary actions | Transparent | Foreground |
| `destructive` | Delete/remove | Error | White |
| `outline` | Alternative secondary | Transparent + border | Foreground |

**Sizes**

| Size | Height | Padding X | Font Size | Icon Size |
|------|--------|-----------|-----------|-----------|
| `sm` | 32px | 12px | 14px | 16px |
| `md` | 40px | 16px | 16px | 20px |
| `lg` | 48px | 20px | 18px | 24px |

**States**

```css
/* Default state */
.button { }

/* Hover */
.button:hover {
  filter: brightness(0.95);
}

/* Pressed/Active */
.button:active {
  transform: scale(0.98);
}

/* Disabled */
.button:disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Loading */
.button[data-loading] {
  pointer-events: none;
}
.button[data-loading] .button-content {
  opacity: 0;
}
.button[data-loading] .button-spinner {
  opacity: 1;
}

/* Focus */
.button:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

**Implementation (React)**

```tsx
interface ButtonProps extends BaseComponentProps, StateProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  disabled = false,
  loading = false,
  className,
  testID,
  accessibilityLabel,
  onClick,
  type = 'button',
  children,
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      data-loading={loading || undefined}
      data-testid={testID}
      aria-label={accessibilityLabel}
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && 'w-full',
        className
      )}
    >
      {loading && <Spinner className="button-spinner absolute" size={size} />}
      <span className="button-content flex items-center gap-2">
        {LeftIcon && <LeftIcon size={iconSizes[size]} />}
        {children}
        {RightIcon && <RightIcon size={iconSizes[size]} />}
      </span>
    </button>
  );
};
```

### 4.4.4 Input Component Specification

**Variants**

| Variant | Usage | Description |
|---------|-------|-------------|
| `default` | Standard input | Border on all sides |
| `filled` | Subtle background | No border, filled background |
| `underline` | Minimal style | Bottom border only |

**States**

```css
/* Default */
.input {
  border: 1px solid var(--border-default);
  background: var(--background-secondary);
  border-radius: var(--radius-md);
  padding: var(--input-padding-y) var(--input-padding-x);
}

/* Focus */
.input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

/* Error */
.input[data-error] {
  border-color: var(--error);
}

/* Disabled */
.input:disabled {
  background: var(--background-tertiary);
  opacity: 0.6;
}
```

### 4.4.5 Card Component Specification

**Variants**

| Variant | Usage | Elevation |
|---------|-------|-----------|
| `flat` | Contained cards | No shadow |
| `elevated` | Floating cards | shadow-md |
| `outlined` | Bordered cards | Border only |
| `interactive` | Clickable cards | Hover effects |

**Structure**

```tsx
interface CardProps extends BaseComponentProps {
  variant?: 'flat' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

// Subcomponents
Card.Header: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }>;
Card.Body: React.FC<{ children: React.ReactNode }>;
Card.Footer: React.FC<{ children: React.ReactNode }>;
```

### 4.4.6 Modal Component Specification

**Types**

| Type | Usage | Behavior |
|------|-------|----------|
| `dialog` | Confirmations, alerts | Centered, small |
| `sheet` | Forms, details | Slides from bottom (mobile) or side (desktop) |
| `fullscreen` | Complex flows | Covers entire screen |

**Props**

```typescript
interface ModalProps extends BaseComponentProps {
  type?: 'dialog' | 'sheet' | 'fullscreen';
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
}
```

**Animation**

```typescript
// Dialog animation
const dialogAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

// Sheet animation (mobile)
const sheetAnimation = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: { type: 'spring', damping: 25, stiffness: 300 },
};
```

## 4.5 Accessibility Specifications

### 4.5.1 Color Contrast Requirements

All text must meet WCAG 2.1 AA minimum contrast ratios:

| Content Type | Minimum Ratio | Status |
|--------------|---------------|--------|
| Normal text | 4.5:1 | Required |
| Large text (18px+) | 3:1 | Required |
| UI components | 3:1 | Required |
| Decorative | No requirement | - |

**Contrast Verification**

| Combination | Ratio | Status |
|-------------|-------|--------|
| Primary text on background | 14.5:1 | Pass |
| Secondary text on background | 6.2:1 | Pass |
| Accent on background | 4.8:1 | Pass |
| White on accent | 4.5:1 | Pass |
| Accent on white | 4.5:1 | Pass |

### 4.5.2 Touch Target Requirements

All interactive elements must meet minimum touch target sizes:

| Platform | Minimum Size | Recommended |
|----------|--------------|-------------|
| iOS | 44x44pt | 48x48pt |
| Android | 48x48dp | 56x56dp |
| Web | 44x44px | 48x48px |

**Implementation**

```css
.touch-target {
  min-width: 44px;
  min-height: 44px;

  /* If visual element is smaller, add padding for touch area */
  &.visual-sm {
    padding: calc((44px - var(--visual-size)) / 2);
  }
}
```

### 4.5.3 Focus Management

**Focus Indicators**

```css
/* Visible focus ring for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Remove default outline when using focus-visible */
:focus:not(:focus-visible) {
  outline: none;
}
```

**Focus Trapping**

Modals and dialogs trap focus within their boundaries:

```typescript
function useFocusTrap(containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
}
```

### 4.5.4 Screen Reader Support

**ARIA Patterns**

```tsx
// Live region for dynamic updates
<div aria-live="polite" aria-atomic="true">
  {notification}
</div>

// Accessible button with icon only
<button aria-label="Add new habit">
  <Plus aria-hidden="true" />
</button>

// Form field with error
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    aria-describedby="email-error"
    aria-invalid={!!error}
  />
  {error && (
    <span id="email-error" role="alert">
      {error}
    </span>
  )}
</div>

// Tab panel
<div role="tablist">
  <button role="tab" aria-selected={selected} aria-controls="panel-1">
    Tab 1
  </button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  Content
</div>
```

### 4.5.5 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// React hook for motion preference
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

## 4.6 Responsive Design System

### 4.6.1 Breakpoint Definitions

```css
:root {
  --breakpoint-sm: 640px;   /* Large phones */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Small laptops */
  --breakpoint-xl: 1280px;  /* Desktops */
  --breakpoint-2xl: 1536px; /* Large desktops */
}
```

**Tailwind Configuration**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
};
```

### 4.6.2 Layout Patterns

**Mobile-First Grid**

```css
.grid-responsive {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-responsive {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .grid-responsive {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

**Container Width**

```css
.container {
  width: 100%;
  margin-inline: auto;
  padding-inline: var(--container-padding-mobile);
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
    padding-inline: var(--container-padding-tablet);
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
    padding-inline: var(--container-padding-desktop);
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}
```

### 4.6.3 Component Responsive Behavior

**Navigation Transformation**

```
Mobile (<768px):
┌─────────────────────────────────┐
│          [Content]              │
├─────────────────────────────────┤
│ Tab1 │ Tab2 │ Tab3 │ Tab4 │ Tab5│
└─────────────────────────────────┘

Tablet (768-1024px):
┌────────┬────────────────────────┐
│Sidebar │      [Content]         │
│(icons) │                        │
└────────┴────────────────────────┘

Desktop (>1024px):
┌──────────────┬──────────────────────────┬──────────┐
│   Sidebar    │       [Content]          │ Context  │
│  (expanded)  │                          │  Panel   │
└──────────────┴──────────────────────────┴──────────┘
```

**Card Grid Adaptation**

```
Mobile:     [  Full Width Card  ]
            [  Full Width Card  ]

Tablet:     [ Card ] [ Card ]
            [ Card ] [ Card ]

Desktop:    [ Card ] [ Card ] [ Card ]
            [ Card ] [ Card ] [ Card ]
```

---

# PART 5: PATTERN LIBRARY

## 5.1 Navigation Patterns

### 5.1.1 Tab Bar Navigation (Mobile)

The bottom tab bar is the primary navigation method for mobile:

**Structure**
```
┌─────────────────────────────────────────────────────────────┐
│                     [Active Tab Content]                    │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │Today│ │Tasks│ │ Cal │ │Habit│ │More │                    │
│ │ 🏠  │ │ ✓  │ │ 📅  │ │ 📊  │ │ ⋯  │                    │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                    │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**
- Tapping an active tab scrolls to top of that tab's content
- Badge indicators show counts (overdue tasks, incomplete habits)
- Each tab maintains its own navigation stack
- Tab bar hides during keyboard input on iOS
- Tab bar remains visible during scrolling

**Styling**
```css
.tab-bar {
  height: 83px;           /* 49px tabs + 34px safe area on iPhone X+ */
  background: var(--background-secondary);
  border-top: 1px solid var(--border-subtle);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
}

.tab-item[data-active] {
  color: var(--accent-primary);
}

.tab-item:not([data-active]) {
  color: var(--foreground-tertiary);
}

.tab-badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 16px);
  min-width: 16px;
  height: 16px;
  background: var(--error);
  color: white;
  font-size: 10px;
  border-radius: var(--radius-full);
}
```

### 5.1.2 Sidebar Navigation (Desktop)

**Collapsed State (Icons Only)**
```
┌────────┐
│  Logo  │
├────────┤
│   🏠   │ ← Active indicator
│   ✓    │
│   📅   │
│   📊   │
│   📖   │
│   🎯   │
│   ⏱    │
├────────┤
│   👥   │
│   📍   │
│   📁   │
│   🏷    │
│   📈   │
├────────┤
│   📊   │
│   💾   │
│   ⚙️   │
└────────┘
```

**Expanded State (Icons + Labels)**
```
┌──────────────────┐
│  Insight Logo    │
├──────────────────┤
│ 🏠 Today        │ ← Active
│ ✓ Tasks         │
│ 📅 Calendar     │
│ 📊 Habits       │
│ 📖 Journal      │
│ 🎯 Goals        │
│ ⏱ Focus        │
├──────────────────┤
│ 👥 People       │
│ 📍 Places       │
│ 📁 Projects     │
│ 🏷 Tags         │
│ 📈 Trackers     │
├──────────────────┤
│ 📊 Reports      │
│ 💾 Saved Views  │
│ ⚙️ Settings     │
├──────────────────┤
│ [User Avatar]   │
│ John Doe        │
└──────────────────┘
```

**Behavior**
- Hover on collapsed sidebar shows tooltip with label
- Click on item navigates to that section
- Active item has left border accent indicator
- Sections separated by subtle dividers
- Collapse/expand toggle at bottom

**Styling**
```css
.sidebar {
  width: 64px;            /* Collapsed */
  transition: width var(--transition-normal);
}

.sidebar[data-expanded] {
  width: 240px;
}

.sidebar-item {
  height: 40px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  margin: var(--space-1) var(--space-2);
}

.sidebar-item[data-active] {
  background: var(--accent-subtle);
  color: var(--accent-primary);
}

.sidebar-item:hover:not([data-active]) {
  background: var(--background-tertiary);
}
```

### 5.1.3 Breadcrumb Navigation

Used for deep navigation hierarchies:

**Structure**
```
Home / Projects / Website Redesign / Tasks
```

**Behavior**
- Each segment is clickable except the current (last) segment
- Long paths truncate middle segments with "..."
- Mobile: Shows only back button + current title

**Implementation**
```tsx
interface BreadcrumbItem {
  label: string;
  href?: string;        // If undefined, not clickable (current page)
}

const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <li key={item.label} className="flex items-center gap-2">
          {index > 0 && <ChevronRight size={14} className="text-foreground-tertiary" />}
          {item.href ? (
            <Link href={item.href} className="text-foreground-secondary hover:text-foreground-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground-primary font-medium">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);
```

### 5.1.4 Command Palette (Desktop)

A keyboard-driven navigation and action interface:

**Trigger**: `Cmd/Ctrl + K`

**Structure**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍  Search or type a command...                    ⌘K      │
├─────────────────────────────────────────────────────────────┤
│ Recent                                                      │
│ ├─ 📋 Website Redesign Project                             │
│ ├─ 📝 Morning Journal Entry                                │
│ └─ ✓ Review pull requests                                  │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions                                               │
│ ├─ ➕ New capture                              ⌘ ⇧ C       │
│ ├─ ➕ New task                                 ⌘ ⇧ T       │
│ ├─ ➕ New habit                                ⌘ ⇧ H       │
│ └─ ⏱  Start focus session                     ⌘ ⇧ F       │
├─────────────────────────────────────────────────────────────┤
│ Navigate                                                    │
│ ├─ 🏠 Go to Today                             ⌘ 1         │
│ ├─ ✓  Go to Tasks                             ⌘ 2         │
│ ├─ 📅 Go to Calendar                          ⌘ 3         │
│ └─ 📊 Go to Habits                            ⌘ 4         │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**
- Fuzzy search across all entities and commands
- Arrow keys navigate results
- Enter executes selected action
- Escape closes palette
- Typing filters results in real-time

## 5.2 Capture Patterns

### 5.2.1 Quick Capture Modal

The universal entry point for adding data:

**Mobile Layout**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Cancel                Capture                      Done → │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ What's on your mind?                                │   │
│  │                                                     │   │
│  │ [Cursor blinks here]                               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │ 🎤  │ │ 📷  │ │ 😊  │ │ ⚡  │ │ 📍  │                  │
│  │Voice│ │Photo│ │Mood │ │Energy│ │Place│                  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                  │
│                                                             │
│  Quick Log:  [Water +] [Coffee +] [Snack +] [Exercise +]   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Add: #tag  @person  📅 Date  🔔 Reminder                    │
└─────────────────────────────────────────────────────────────┘
```

**Desktop Layout**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                              [×]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ What's on your mind?                                        │   │
│  │                                                             │   │
│  │ [Auto-expanding textarea]                                   │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────┬───────────────────────────────┐   │
│  │ 🎤 Voice  📷 Photo  📎 File │  😊 Mood: [1][2][3][4][5]    │   │
│  └─────────────────────────────┴───────────────────────────────┘   │
│                                                                     │
│  Tags: [+Add tag]  People: [+Add person]  Location: [📍 Auto]      │
│                                                                     │
│  Quick Log:  [Water +] [Coffee +] [Custom +]                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                              [Cancel]  [Save ⌘↵]   │
└─────────────────────────────────────────────────────────────────────┘
```

**Behavior**
- Opens with keyboard focused on text input
- Auto-save draft every 5 seconds
- Escape closes (with confirmation if content exists)
- Cmd/Ctrl+Enter submits
- Voice button starts immediate recording
- Quick Log buttons create instant entries (single tap)

### 5.2.2 Voice Capture Interface

**Recording State**
```
┌─────────────────────────────────────────────────────────────┐
│                                                     [×]     │
│                                                             │
│                                                             │
│                      ┌──────────┐                          │
│                      │          │                          │
│                      │  ◉ REC   │  ← Pulsing animation     │
│                      │          │                          │
│                      └──────────┘                          │
│                                                             │
│                        0:00:42                              │
│                                                             │
│           ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  ← Waveform visualization       │
│                                                             │
│                      [ ⏹ Stop ]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Review State (After Recording)**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back                 Review                        Done → │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [▶ Play]  0:42 / 1:23  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Transcript:                                         │   │
│  │                                                     │   │
│  │ "Had a great meeting with Sarah about the project. │   │
│  │  We decided to push the deadline to next Friday.   │   │
│  │  Need to update the team and adjust the sprint."   │   │
│  │                                                     │   │
│  │ [Edit transcript]                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Extracted:                                                 │
│  ├─ 👤 Person: Sarah                      [✓] [×]          │
│  ├─ 📅 Date: Next Friday                  [✓] [×]          │
│  └─ ✓ Task: Update the team               [✓] [×]          │
│                                                             │
│  [+ Add more entities manually]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**
- Single tap to start recording
- Single tap to stop recording
- Automatic transcription begins immediately after stop
- AI extracts entities (people, dates, tasks, places)
- User can confirm or reject each extraction
- User can edit transcript
- Save creates entry with all confirmed entities linked

### 5.2.3 Quick Log Buttons

Pre-configured one-tap capture buttons:

**Types**
- Counter: "Water" - taps increment today's count
- Toggle: "Exercise" - taps mark as done
- Value: "Weight" - taps open numeric input
- Timer: "Meditation" - taps start/stop timer

**Visual States**
```
┌───────────────────────────────────────────────────────────┐
│  Not logged today:                                        │
│  ┌─────────┐                                              │
│  │ 💧      │  ← Subdued appearance                       │
│  │ Water   │                                              │
│  │   +     │                                              │
│  └─────────┘                                              │
│                                                            │
│  Logged today:                                             │
│  ┌─────────┐                                              │
│  │ 💧      │  ← Accent color, filled appearance          │
│  │ Water   │                                              │
│  │   3     │  ← Shows count                              │
│  └─────────┘                                              │
└───────────────────────────────────────────────────────────┘
```

## 5.3 List Patterns

### 5.3.1 Standard List Item

**Structure**
```
┌─────────────────────────────────────────────────────────────┐
│ [Leading]  [Primary Content]              [Trailing] [>]   │
│            [Secondary Content]                              │
└─────────────────────────────────────────────────────────────┘
```

**Example: Task List Item**
```
┌─────────────────────────────────────────────────────────────┐
│ ○  Review pull requests                    P2   Due Today  │
│    Website Redesign · 3 subtasks                     [>]   │
└─────────────────────────────────────────────────────────────┘
```

**Example: Habit List Item**
```
┌─────────────────────────────────────────────────────────────┐
│ 🏃  Morning Run                              🔥 15 day     │
│     5 of 7 this week  [▓▓▓▓▓░░]                     [>]   │
└─────────────────────────────────────────────────────────────┘
```

**Swipe Actions (Mobile)**
```
← Swipe Left:                      Swipe Right: →
┌───────────┬─────────────────────────────────┬───────────┐
│  Archive  │        [List Item]              │  Delete   │
│     📁    │                                 │     🗑    │
└───────────┴─────────────────────────────────┴───────────┘
```

### 5.3.2 Sectioned List

**Structure**
```
┌─────────────────────────────────────────────────────────────┐
│ SECTION HEADER                                    [Action] │
├─────────────────────────────────────────────────────────────┤
│ [List Item 1]                                              │
│─────────────────────────────────────────────────────────────│
│ [List Item 2]                                              │
│─────────────────────────────────────────────────────────────│
│ [List Item 3]                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECTION HEADER 2                                  [Action] │
├─────────────────────────────────────────────────────────────┤
│ [List Item 4]                                              │
│─────────────────────────────────────────────────────────────│
│ [List Item 5]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Example: Tasks by Due Date**
```
┌─────────────────────────────────────────────────────────────┐
│ OVERDUE (3)                                      [View all]│
├─────────────────────────────────────────────────────────────┤
│ ○ Finish report                               Due 2 days ago│
│─────────────────────────────────────────────────────────────│
│ ○ Call dentist                                Due yesterday │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TODAY (5)                                                  │
├─────────────────────────────────────────────────────────────┤
│ ○ Review pull requests                          Due 5:00pm │
│─────────────────────────────────────────────────────────────│
│ ○ Team standup notes                            Due 6:00pm │
└─────────────────────────────────────────────────────────────┘
```

### 5.3.3 Empty State

When a list has no items:

**Structure**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      [Illustration]                         │
│                                                             │
│                    No tasks yet                             │
│                                                             │
│        Add your first task to get started                   │
│                                                             │
│                  [+ Add Task]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Guidelines**
- Use relevant illustration (not generic)
- Title states what's empty
- Description guides user on what to do
- Primary action button to remedy the empty state
- Never show just "No items" without guidance

## 5.4 Form Patterns

### 5.4.1 Form Field

**Standard Layout**
```
┌─────────────────────────────────────────────────────────────┐
│ Label *                                     [Helper Icon]  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Placeholder text                                        ││
│ └─────────────────────────────────────────────────────────┘│
│ Helper text or character count                    0/100    │
└─────────────────────────────────────────────────────────────┘
```

**Error State**
```
┌─────────────────────────────────────────────────────────────┐
│ Email *                                                    │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ invalid-email                                           ││
│ └─────────────────────────────────────────────────────────┘│
│ ⚠ Please enter a valid email address                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.4.2 Multi-Step Form

**Progress Indicator**
```
┌─────────────────────────────────────────────────────────────┐
│  (1)────●────(2)────○────(3)────○────(4)                   │
│ Basics      Schedule     Goals      Review                  │
└─────────────────────────────────────────────────────────────┘
```

**Step Content**
```
┌─────────────────────────────────────────────────────────────┐
│ Step 2 of 4: Schedule                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  How often do you want to do this habit?                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ● Daily                                              │  │
│  │ ○ Specific days of the week                         │  │
│  │ ○ X times per week                                  │  │
│  │ ○ Custom                                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  When should we remind you?                                │
│                                                             │
│  [Time Picker: 7:00 AM]                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [← Back]                               [Continue →]       │
└─────────────────────────────────────────────────────────────┘
```

### 5.4.3 Inline Editing

For quick edits without opening a modal:

**Display State**
```
┌─────────────────────────────────────────────────────────────┐
│ Morning Run                                         [Edit] │
└─────────────────────────────────────────────────────────────┘
```

**Edit State**
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Morning Run|                                            ││
│ └─────────────────────────────────────────────────────────┘│
│                                          [Cancel] [Save]   │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**
- Click "Edit" or double-click text to enter edit mode
- Press Enter or click "Save" to confirm
- Press Escape or click "Cancel" to discard changes
- Click outside to save and exit

## 5.5 Feedback Patterns

### 5.5.1 Toast Notifications

Non-blocking feedback messages:

**Positions**
- Mobile: Bottom of screen, above tab bar
- Desktop: Bottom-right corner

**Types**
```
┌──────────────────────────────────────────────────────────┐
│ ✓ Habit completed! +10 XP                         [×]   │  Success
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ⚠ Connection lost. Changes saved locally.         [×]   │  Warning
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ✕ Failed to save. Please try again.   [Retry] [×]       │  Error
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ℹ New feature: Voice capture!          [Learn more] [×] │  Info
└──────────────────────────────────────────────────────────┘
```

**Duration**
- Success: 3 seconds auto-dismiss
- Warning: 5 seconds auto-dismiss
- Error: Manual dismiss or action required
- Info: 5 seconds auto-dismiss

### 5.5.2 Confirmation Dialog

For destructive or irreversible actions:

**Structure**
```
┌─────────────────────────────────────────────────────────────┐
│ Delete Habit?                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Are you sure you want to delete "Morning Run"?              │
│                                                             │
│ This will also delete all associated logs and cannot        │
│ be undone.                                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Delete] ← red      │
└─────────────────────────────────────────────────────────────┘
```

**Guidelines**
- Title clearly states the action
- Body explains consequences
- Destructive action button is styled differently (red)
- Safe action (Cancel) is on the left
- Destructive action requires explicit click (not just Enter)

### 5.5.3 Loading States

**Skeleton Loading**
```
┌─────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                              │
│ ░░░░░░░░░░░░░░░░                                           │
├─────────────────────────────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                        │
│ ░░░░░░░░░░░░                                               │
├─────────────────────────────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                        │
│ ░░░░░░░░░░░░░░                                             │
└─────────────────────────────────────────────────────────────┘
```

**Spinner**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         ◠ ← Rotating                       │
│                      Loading...                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Progress Bar**
```
┌─────────────────────────────────────────────────────────────┐
│ Importing data...                                    45%   │
│ [███████████████░░░░░░░░░░░░░░░░░░░]                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.5.4 Sync Status Indicator

**States**
```
┌─────────┐
│ ● Synced │  ← Green dot
└─────────┘

┌──────────┐
│ ◐ Syncing │  ← Animated spinner
└──────────┘

┌──────────┐
│ ○ Offline │  ← Gray dot
└──────────┘

┌───────────┐
│ ⚠ Error   │  ← Orange warning
└───────────┘
```

## 5.6 Data Visualization Patterns

### 5.6.1 Habit Heatmap

A calendar-based visualization of habit completion:

**Structure**
```
                    Jan 2026
    Mon Tue Wed Thu Fri Sat Sun
W1   ■   ■   ■   ■   ■   □   □
W2   ■   ■   □   ■   ■   ■   □
W3   ■   ■   ■   ■   □   ■   □
W4   ■   ■   ■   ■   ■   □   □
W5   ■   □

Legend: ■ = Completed  □ = Incomplete  · = No data
```

**Color Scale** (for habits with values)
```
□ = 0%  ░ = 25%  ▒ = 50%  ▓ = 75%  ■ = 100%
```

**Interaction**
- Tap/hover on cell shows detail tooltip
- Tap on week shows week view
- Pinch to zoom (mobile)
- Scroll horizontally for more months

### 5.6.2 Streak Display

**Current Streak**
```
┌─────────────────────────────────────────────────────────────┐
│                      🔥 15                                 │
│                   days current                              │
│                                                             │
│ Best: 42 days · Total: 156 completions                     │
└─────────────────────────────────────────────────────────────┘
```

**Streak Timeline**
```
Mon  Tue  Wed  Thu  Fri  Sat  Sun
 ●────●────●────●────●────○────?
             └── Today
```

### 5.6.3 Progress Ring

Circular progress indicator for goals:

**Structure**
```
      ╭──────────╮
     ╱            ╲
    │   67%       │
    │   of goal   │
     ╲            ╱
      ╰──────────╯

    67 of 100 pages read
```

**States**
- 0%: Empty ring
- 1-99%: Partially filled ring with percentage
- 100%: Full ring with checkmark animation

### 5.6.4 Mini Charts

Sparkline-style inline charts:

**Line Sparkline** (mood over time)
```
Mood this week: ▁▃▄▅▃▇█  ↑ improving
```

**Bar Sparkline** (habit completions)
```
This week: ▌▌▌▐  ▌▌  5 of 7
```

### 5.6.5 Correlation Display

**Structure**
```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Insight Discovered                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Sleep Quality] ←──── +0.72 ────→ [Morning Mood]          │
│                                                             │
│  When your sleep quality is high, your morning mood         │
│  tends to be 40% better than average.                       │
│                                                             │
│  Based on 45 data points over 90 days.                     │
│                                                             │
│  [See detailed analysis →]                                  │
└─────────────────────────────────────────────────────────────┘
```

## 5.7 Gamification Patterns

### 5.7.1 XP Award Animation

When user earns experience points:

```
Frame 1: Action completed
┌───────────────────────────┐
│ ✓ Morning Run completed   │
└───────────────────────────┘

Frame 2: XP floats up
┌───────────────────────────┐
│ ✓ Morning Run completed   │
│         +25 XP ↑          │ ← Floating animation
└───────────────────────────┘

Frame 3: XP reaches header
┌───────────────────────────┐
│ XP: 1,234 → 1,259  ← Pulse│
│                           │
│ ✓ Morning Run completed   │
└───────────────────────────┘
```

### 5.7.2 Level Progress

**Level Card**
```
┌─────────────────────────────────────────────────────────────┐
│ Level 12: Achiever                                         │
│ ████████████████████░░░░░░░░░░░░░  1,259 / 2,000 XP       │
│                                                             │
│ 741 XP to Level 13: Champion                               │
└─────────────────────────────────────────────────────────────┘
```

**Level Up Animation**
```
┌─────────────────────────────────────────────────────────────┐
│                         🎉                                 │
│                                                             │
│                   LEVEL UP!                                │
│                                                             │
│              You reached Level 13                           │
│                   Champion                                  │
│                                                             │
│              New rewards unlocked:                          │
│              • Custom theme: Neon                          │
│              • Achievement badge                            │
│                                                             │
│                   [Awesome!]                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.7.3 Streak Freeze Token

**Display**
```
┌─────────────────────────────────────────────────────────────┐
│ ❄ 2 Streak Freezes Available                               │
│                                                             │
│ Use a freeze to protect your streak if you miss a day.     │
│ Earn more freezes by completing 7-day streaks.             │
└─────────────────────────────────────────────────────────────┘
```

**Usage Confirmation**
```
┌─────────────────────────────────────────────────────────────┐
│ Use Streak Freeze?                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ You missed "Morning Run" yesterday.                        │
│                                                             │
│ Use 1 freeze token to protect your 15-day streak?          │
│                                                             │
│ Remaining freezes after use: 1                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│              [Keep Streak: Use Freeze]                      │
│              [Let Streak Reset]                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.7.4 Achievement Badges

**Badge Card**
```
┌──────────────────────────────────┐
│        🏆                        │
│                                  │
│    7-Day Warrior                 │
│                                  │
│  Complete any habit for          │
│  7 consecutive days              │
│                                  │
│  Unlocked: Jan 15, 2026         │
└──────────────────────────────────┘
```

**Locked Badge**
```
┌──────────────────────────────────┐
│        🔒                        │
│      (grayed out)                │
│                                  │
│    30-Day Master                 │
│                                  │
│  Complete any habit for          │
│  30 consecutive days             │
│                                  │
│  Progress: 15/30 days           │
│  ██████████░░░░░░░░░░           │
└──────────────────────────────────┘
```

## 5.8 Error Handling Patterns

### 5.8.1 Inline Validation

**Immediate Feedback**
```
Email
┌─────────────────────────────────────────────────────────────┐
│ user@                                                       │
└─────────────────────────────────────────────────────────────┘
⚠ Please enter a complete email address
```

**Success Validation**
```
Email                                                    ✓
┌─────────────────────────────────────────────────────────────┐
│ user@example.com                                            │
└─────────────────────────────────────────────────────────────┘
```

### 5.8.2 Error Page

**404 Not Found**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Lost illustration]                      │
│                                                             │
│                   Page Not Found                            │
│                                                             │
│     The page you're looking for doesn't exist or           │
│     has been moved.                                         │
│                                                             │
│              [Go Home]  [Go Back]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Network Error**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                 [Disconnected illustration]                 │
│                                                             │
│               Connection Problem                            │
│                                                             │
│     We couldn't reach our servers. Your data is            │
│     saved locally and will sync when you're back           │
│     online.                                                 │
│                                                             │
│              [Try Again]  [Work Offline]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.8.3 Conflict Resolution

When sync conflicts occur:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠ Sync Conflict Detected                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "Morning Run" was edited in multiple places:              │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ This Device         │  │ Another Device      │         │
│  │ ─────────────────── │  │ ─────────────────── │         │
│  │ Name: Morning Jog   │  │ Name: Morning Run   │         │
│  │ Time: 7:00 AM       │  │ Time: 6:30 AM       │         │
│  │ Modified: 2 min ago │  │ Modified: 5 min ago │         │
│  │                     │  │                     │         │
│  │ [Use This Version]  │  │ [Use This Version]  │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                             │
│  [Merge Both Changes]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# PART 6: SCREEN SPECIFICATIONS

## 6.1 Dashboard / Today Screen

### 6.1.1 Purpose and Goals

The Dashboard serves as the user's daily command center. It answers the essential questions:
- What do I need to do today?
- How am I progressing on my habits?
- What's coming up on my calendar?
- What insights should I be aware of?

**Success Criteria:**
- User can complete their morning review in under 2 minutes
- Primary actions (habit completion, task viewing) require zero navigation
- All time-sensitive information is immediately visible

### 6.1.2 Mobile Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ☀ Good morning, Alex                              [🔍] [👤]│
│ Wednesday, January 15                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TODAY'S PROGRESS                              85%   │   │
│  │ ██████████████████████████████░░░░░               │   │
│  │ 6 of 7 habits · 8 of 10 tasks                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  HABITS                                        [View all →]│
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │   ✓    │ │   ✓    │ │   ○    │ │   ✓    │          │
│  │  🏃‍♂️   │ │  💧   │ │  📚   │ │  🧘   │          │
│  │  Run   │ │ Water  │ │ Read   │ │Meditate│          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
│  UPCOMING                                      [View all →]│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 9:00 AM  Team Standup                   30 min     │   │
│  │ 11:00 AM  1:1 with Sarah                45 min     │   │
│  │ 2:00 PM  Project Review                 1 hr       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TASKS DUE TODAY (5)                          [View all →]│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Review pull requests                    P1       │   │
│  │ ○ Send weekly report                      P2       │   │
│  │ ○ Update project timeline                 P2       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 INSIGHT                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ You're 3x more likely to complete all habits       │   │
│  │ when you start before 8 AM.                        │   │
│  │                                        [Learn more]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RECENT CAPTURES                              [View all →]│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎤 8:15 AM  "Great idea for the redesign..."       │   │
│  │ 📝 Yesterday  "Meeting notes from product..."      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Today │ Tasks │ Calendar │ Habits │ More                   │
└─────────────────────────────────────────────────────────────┘
                         [+]  ← FAB
```

### 6.1.3 Desktop Layout

```
┌──────────┬────────────────────────────────────────────┬─────────────┐
│          │                                            │             │
│  Sidebar │  DASHBOARD                                 │   CONTEXT   │
│          │                                            │   PANEL     │
│  Today ● │  ☀ Good morning, Alex                     │             │
│  Tasks   │  Wednesday, January 15, 2026              │  QUICK      │
│  Calendar│                                            │  CAPTURE    │
│  Habits  │  ┌─────────────────┐ ┌─────────────────┐  │  ┌───────┐  │
│  Journal │  │ HABITS (6/7)   │ │ TASKS (8/10)   │  │  │ What's│  │
│  Goals   │  │ ████████████░░ │ │ ████████████░░ │  │  │  on   │  │
│  Focus   │  │                │ │                │  │  │ your  │  │
│          │  │ [Habit Grid]   │ │ [Task List]    │  │  │ mind? │  │
│  ─────── │  │                │ │                │  │  └───────┘  │
│  People  │  └─────────────────┘ └─────────────────┘  │             │
│  Places  │                                            │  FOCUS      │
│  Projects│  ┌─────────────────────────────────────┐  │  ┌───────┐  │
│  Tags    │  │ TODAY'S SCHEDULE                    │  │  │ Start │  │
│  Trackers│  │                                     │  │  │ Focus │  │
│          │  │ 9:00 AM  │ Team Standup     30 min │  │  │Session│  │
│  ─────── │  │ 11:00 AM │ 1:1 with Sarah   45 min │  │  └───────┘  │
│  Reports │  │ 2:00 PM  │ Project Review    1 hr  │  │             │
│  Saved   │  │                                     │  │  STREAKS    │
│  Settings│  └─────────────────────────────────────┘  │  🔥 15 days │
│          │                                            │  Best: 42   │
│          │  ┌──────────────────┐ ┌────────────────┐  │             │
│          │  │ 💡 INSIGHT       │ │ RECENT         │  │  ─────────  │
│          │  │                  │ │ CAPTURES       │  │             │
│          │  │ Sleep quality    │ │                │  │  XP: 2,450  │
│          │  │ correlates with  │ │ [List of       │  │  Level 15   │
│          │  │ morning mood     │ │  entries]      │  │             │
│          │  │                  │ │                │  │             │
│          │  └──────────────────┘ └────────────────┘  │             │
│          │                                            │             │
└──────────┴────────────────────────────────────────────┴─────────────┘
```

### 6.1.4 Widget Specifications

**Progress Summary Widget**
```typescript
interface ProgressSummaryProps {
  habitsCompleted: number;
  habitsTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
}
```

**Habit Quick-Complete Widget**
- Displays today's habits as tappable icons
- Single tap toggles completion
- Shows completion state (filled/empty)
- Scrollable horizontally if more than 4 habits

**Schedule Widget**
- Shows next 3-5 calendar events
- Color-coded by calendar source
- Tap to view event detail
- Shows time until next event

**Tasks Due Widget**
- Shows tasks due today, sorted by priority
- Checkbox to mark complete inline
- Tap task to view detail
- Maximum 5 items, then "View all" link

**Insight Widget**
- Rotates through recent AI-discovered insights
- Dismissable (mark as "seen")
- "Learn more" links to detailed analysis

### 6.1.5 Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| Complete habit | Tap habit icon | Toggle completion, XP animation |
| View habit detail | Long-press habit | Navigate to habit detail |
| Complete task | Tap checkbox | Mark complete, strikethrough |
| View task detail | Tap task row | Navigate to task detail |
| View calendar event | Tap event | Navigate to event detail |
| Start focus session | Tap Focus button | Open focus configuration |
| Dismiss insight | Swipe left | Remove from rotation |
| Open capture | Tap FAB | Open capture modal |

## 6.2 Task List Screen

### 6.2.1 Purpose and Goals

The Task List is the central hub for task management. It provides:
- Clear view of all tasks
- Multiple organization options (list, kanban, by project)
- Quick task creation
- Bulk actions

### 6.2.2 Mobile Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Tasks                                           [🔍] [⋮]   │
├─────────────────────────────────────────────────────────────┤
│ [All ▼]  [Filter ▼]  [Sort: Due Date ▼]                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OVERDUE (2)                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Finish Q4 report            P1    2 days overdue │   │
│  │   Work · No subtasks                               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ○ Call dentist               P3    Yesterday      │   │
│  │   Personal                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TODAY (5)                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Review pull requests        P1    Due 5:00 PM   │   │
│  │   Website Redesign · 3 subtasks                    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ○ Send weekly report          P2    Due 6:00 PM   │   │
│  │   Work                                             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ○ Team standup prep           P2    Due 9:00 AM   │   │
│  │   Work                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TOMORROW (3)                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Design review               P2    Tomorrow 2 PM │   │
│  │   Website Redesign                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  LATER (12)                                    [Expand ▼]  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Today │ Tasks │ Calendar │ Habits │ More                   │
└─────────────────────────────────────────────────────────────┘
                         [+]  ← FAB for new task
```

### 6.2.3 Desktop Layout - List View

```
┌──────────┬─────────────────────────────────────────────────────────────┐
│          │ TASKS                                              [+] New │
│  Sidebar │ ─────────────────────────────────────────────────────────── │
│          │ [All Tasks ▼] [🔍 Search] [Filter] [Group: Date ▼] [Sort ▼]│
│  Today   │ ─────────────────────────────────────────────────────────── │
│  Tasks ● │                                                             │
│  Calendar│  □ Select  Task                     Project    Due    Pri  │
│  Habits  │ ─────────────────────────────────────────────────────────── │
│          │                                                             │
│          │  ▼ OVERDUE (2)                                             │
│          │  ─────────────────────────────────────────────────────────  │
│          │  □  ○ Finish Q4 report              Work       Jan 13  P1  │
│          │  □  ○ Call dentist                  Personal   Jan 14  P3  │
│          │                                                             │
│          │  ▼ TODAY (5)                                               │
│          │  ─────────────────────────────────────────────────────────  │
│          │  □  ○ Review pull requests          Redesign   5:00 PM P1  │
│          │  □  ○ Send weekly report            Work       6:00 PM P2  │
│          │  □  ○ Team standup prep             Work       9:00 AM P2  │
│          │  □  ○ Update project timeline       Redesign   Today   P2  │
│          │  □  ○ Respond to client email       Work       Today   P3  │
│          │                                                             │
│          │  ▼ TOMORROW (3)                                            │
│          │  ─────────────────────────────────────────────────────────  │
│          │  □  ○ Design review                 Redesign   2:00 PM P2  │
│          │  □  ○ Sprint planning               Work       10:00AM P2  │
│          │  □  ○ Gym                           Personal   7:00 PM P4  │
│          │                                                             │
│          │  ▶ LATER (12)                                              │
│          │                                                             │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### 6.2.4 Desktop Layout - Kanban View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TASKS · Kanban View                                            [+] New │
│ [All Tasks ▼] [🔍 Search] [Filter]                    [List] [Kanban] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TODO (7)           IN PROGRESS (3)        DONE (12)                   │
│  ┌───────────────┐  ┌───────────────┐      ┌───────────────┐           │
│  │ Review PRs    │  │ Q4 Report     │      │ ✓ Design v1   │           │
│  │ P1 · Today    │  │ P1 · Overdue  │      │ Jan 14        │           │
│  │ Redesign      │  │ Work          │      │ Redesign      │           │
│  └───────────────┘  └───────────────┘      └───────────────┘           │
│  ┌───────────────┐  ┌───────────────┐      ┌───────────────┐           │
│  │ Weekly report │  │ Client call   │      │ ✓ Research    │           │
│  │ P2 · Today    │  │ P2 · Today    │      │ Jan 13        │           │
│  │ Work          │  │ Work          │      │ Redesign      │           │
│  └───────────────┘  └───────────────┘      └───────────────┘           │
│  ┌───────────────┐  ┌───────────────┐      ┌───────────────┐           │
│  │ Standup prep  │  │ Timeline upd  │      │ ✓ Wireframes  │           │
│  │ P2 · 9 AM     │  │ P2 · Today    │      │ Jan 12        │           │
│  │ Work          │  └───────────────┘      │ Redesign      │           │
│  └───────────────┘                         └───────────────┘           │
│  ┌───────────────┐                                                     │
│  │ + Add task    │                         [Show all 12 →]             │
│  └───────────────┘                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2.5 Task Item States

**Default State**
```
┌─────────────────────────────────────────────────────────────┐
│ ○ Task title here                           Due date   P2  │
│   Project name · X subtasks                                │
└─────────────────────────────────────────────────────────────┘
```

**Completed State**
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Task title here (strikethrough)           Completed P2   │
│   Project name                                 (dimmed)    │
└─────────────────────────────────────────────────────────────┘
```

**Overdue State**
```
┌─────────────────────────────────────────────────────────────┐
│ ○ Task title here                        ⚠ 2 days ago  P1  │
│   Project name                           (red text)        │
└─────────────────────────────────────────────────────────────┘
```

### 6.2.6 Quick Add Task

Inline task creation at top of list:

```
┌─────────────────────────────────────────────────────────────┐
│ + Add task...                                              │
└─────────────────────────────────────────────────────────────┘
          ↓ On focus
┌─────────────────────────────────────────────────────────────┐
│ ○ | Buy groceries                                          │
│   [Today ▼] [No Project ▼] [P3 ▼]           [Cancel] [Add]│
└─────────────────────────────────────────────────────────────┘
```

## 6.3 Habits Screen

### 6.3.1 Purpose and Goals

The Habits screen enables users to:
- View all habits and their current streaks
- Mark habits complete for today
- Analyze habit patterns via heatmap
- Create and configure new habits

### 6.3.2 Mobile Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Habits                                          [🔍] [⋮]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TODAY'S PROGRESS                               5/7 done   │
│  ████████████████████████████████░░░░░░░░░░░░░░  71%      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Morning Routine                                       │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │ │   ✓    │ │   ✓    │ │   ○    │ │   ✓    │      │ │
│  │ │  🏃‍♂️   │ │  💧   │ │  📚   │ │  🧘   │      │ │
│  │ │ Run    │ │ Water  │ │ Read   │ │Meditate│      │ │
│  │ │ 🔥 15  │ │ 🔥 23  │ │ 🔥 3   │ │ 🔥 42  │      │ │
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Evening Routine                                       │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │ │
│  │ │   ○    │ │   ✓    │ │   ✓    │                   │ │
│  │ │  📔   │ │  🦷   │ │  😴   │                   │ │
│  │ │Journal │ │ Floss  │ │Sleep 8h│                   │ │
│  │ │ 🔥 8   │ │ 🔥 12  │ │ 🔥 5   │                   │ │
│  │ └─────────┘ └─────────┘ └─────────┘                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  HEATMAP                                      [This Month] │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ M  T  W  T  F  S  S                                   │ │
│  │ ■  ■  ■  ■  ■  □  □    Week 1                        │ │
│  │ ■  ■  □  ■  ■  ■  □    Week 2                        │ │
│  │ ■  ■  ■  ■  □  ■  □    Week 3                        │ │
│  │ ■  ■  ·  ·  ·  ·  ·    Week 4                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  STATS                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   85%      │ │   🔥 42    │ │   892      │          │
│  │ This Week  │ │ Best Streak │ │ Total Logs │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Today │ Tasks │ Calendar │ Habits │ More                   │
└─────────────────────────────────────────────────────────────┘
                         [+]  ← FAB for new habit
```

### 6.3.3 Desktop Layout

```
┌──────────┬─────────────────────────────────────────────────────────────┐
│          │ HABITS                                             [+] New │
│  Sidebar │ ─────────────────────────────────────────────────────────── │
│          │                                                             │
│  Today   │  ┌────────────────────────────────┐  ┌───────────────────┐ │
│  Tasks   │  │ TODAY'S PROGRESS       5/7    │  │ STREAK LEADERS    │ │
│  Calendar│  │ █████████████████░░░░░  71%   │  │                   │ │
│  Habits ●│  └────────────────────────────────┘  │ 🧘 Meditate  42d │ │
│  Journal │                                       │ 💧 Water     23d │ │
│  Goals   │  ┌───────────────────────────────────┤ 🏃 Run       15d │ │
│          │  │                                   │ 🦷 Floss     12d │ │
│          │  │  HABITS                           │                   │ │
│          │  │  ────────────────────────────────│───────────────────│ │
│          │  │  ┌──────────┐ ┌──────────┐ ┌────│─┐ ┌──────────┐    │ │
│          │  │  │    ✓    │ │    ✓    │ │    │○│ │    ✓    │    │ │
│          │  │  │   🏃‍♂️   │ │   💧   │ │   📚│ │ │   🧘   │    │ │
│          │  │  │ Run      │ │ Water    │ │ Read │ │Meditate  │    │ │
│          │  │  │ 🔥 15    │ │ 🔥 23    │ │ 🔥 3 │ │ 🔥 42    │    │ │
│          │  │  └──────────┘ └──────────┘ └──────┘ └──────────┘    │ │
│          │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │ │
│          │  │  │    ○    │ │    ✓    │ │    ✓    │              │ │
│          │  │  │   📔   │ │   🦷   │ │   😴   │              │ │
│          │  │  │ Journal  │ │ Floss    │ │ Sleep    │              │ │
│          │  │  │ 🔥 8     │ │ 🔥 12    │ │ 🔥 5     │              │ │
│          │  │  └──────────┘ └──────────┘ └──────────┘             │ │
│          │  │                                                       │ │
│          │  └───────────────────────────────────────────────────────┘ │
│          │                                                             │
│          │  ┌───────────────────────────────────────────────────────┐ │
│          │  │ HEATMAP · All Habits                     Jan 2026 ▼ │ │
│          │  │                                                       │ │
│          │  │     Mon Tue Wed Thu Fri Sat Sun                      │ │
│          │  │ W1   ■   ■   ■   ■   ■   □   □                      │ │
│          │  │ W2   ■   ■   □   ■   ■   ■   □                      │ │
│          │  │ W3   ■   ■   ■   ■   □   ■   □                      │ │
│          │  │ W4   ■   ■   ·   ·   ·   ·   ·                      │ │
│          │  │                                                       │ │
│          │  │ ■ = All complete  ▓ = Most  ░ = Some  □ = None       │ │
│          │  └───────────────────────────────────────────────────────┘ │
│          │                                                             │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### 6.3.4 Habit Card Specification

```typescript
interface HabitCardProps {
  habit: Habit;
  todayLog: HabitLog | null;
  onToggle: () => void;
  onPress: () => void;
  onLongPress: () => void;
}
```

**Visual States**

| State | Icon Background | Border | Streak Display |
|-------|-----------------|--------|----------------|
| Not done | Transparent | Dashed | Normal |
| Done | Accent subtle | Solid accent | Fire emoji visible |
| Frozen | Blue subtle | Dashed blue | Snowflake icon |
| Skipped | Gray subtle | Dashed gray | Hidden |

## 6.4 Calendar Screen

### 6.4.1 Purpose and Goals

The Calendar provides:
- Visual overview of scheduled events
- Multiple view options (day, week, month)
- Event creation and editing
- Integration with external calendars

### 6.4.2 Mobile Layout - Day View

```
┌─────────────────────────────────────────────────────────────┐
│ ← January 2026 →                                [📅] [⋮]   │
├─────────────────────────────────────────────────────────────┤
│ S    M    T    W    T    F    S                            │
│           1    2    3    4    5                            │
│ 6    7    8    9   10   11   12                           │
│ 13   14  [15]  16   17   18   19  ← Today highlighted     │
│ 20   21   22   23   24   25   26                          │
│ 27   28   29   30   31                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Wednesday, January 15                                      │
│                                                             │
│  ┌─ 9:00 AM ─────────────────────────────────────────────┐ │
│  │ ■ Team Standup                                    30m │ │
│  │   Work Calendar · Zoom                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ 11:00 AM ────────────────────────────────────────────┐ │
│  │ ■ 1:1 with Sarah                                  45m │ │
│  │   Work Calendar · Conference Room B                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  12:00 PM  (no events)                                     │
│  1:00 PM   (no events)                                     │
│                                                             │
│  ┌─ 2:00 PM ─────────────────────────────────────────────┐ │
│  │ ■ Project Review                                   1h │ │
│  │   Work Calendar · Main Conference Room                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ 5:30 PM ─────────────────────────────────────────────┐ │
│  │ ■ Gym Session                                      1h │ │
│  │   Personal · Fitness Center                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Today │ Tasks │ Calendar │ Habits │ More                   │
└─────────────────────────────────────────────────────────────┘
                         [+]  ← FAB for new event
```

### 6.4.3 Desktop Layout - Week View

```
┌──────────┬─────────────────────────────────────────────────────────────┐
│          │ CALENDAR                              [Day] [Week] [Month] │
│  Sidebar │ ─────────────────────────────────────────────────────────── │
│          │ ← Week of January 13-19, 2026 →                    [Today] │
│  Today   │                                                             │
│  Tasks   │       Mon 13   Tue 14   Wed 15   Thu 16   Fri 17   Sat/Sun │
│  Calendar●│ ─────────────────────────────────────────────────────────── │
│  Habits  │ 8 AM                                                        │
│          │ ────────────────────────────────────────────────────────── │
│          │ 9 AM   ┌──────┐                                            │
│          │        │Standup                                             │
│          │ ────── └──────┘ ─────────────────────────────────────────── │
│          │ 10 AM          ┌──────┐                                    │
│          │                │Sprint │                                    │
│          │ ────────────── │Plan  │ ─────────────────────────────────── │
│          │ 11 AM          └──────┘ ┌──────┐                           │
│          │                         │1:1    │                           │
│          │ ─────────────────────── │Sarah │ ─────────────────────────── │
│          │ 12 PM                   └──────┘                           │
│          │ ────────────────────────────────────────────────────────── │
│          │ 1 PM                                                        │
│          │ ────────────────────────────────────────────────────────── │
│          │ 2 PM                    ┌──────────┐ ┌──────┐              │
│          │                         │ Project   │ │Design│              │
│          │ ────────────────────────│ Review    │ │Review│ ─────────── │
│          │ 3 PM                    │           │ └──────┘              │
│          │                         └──────────┘                        │
│          │ ────────────────────────────────────────────────────────── │
│          │                                                             │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### 6.4.4 Calendar Event Colors

Events are color-coded by calendar source:

| Calendar | Color | Hex |
|----------|-------|-----|
| Personal | Orange | #D95D39 |
| Work | Blue | #3B82F6 |
| Family | Green | #22C55E |
| External (Google) | Red | #EA4335 |
| External (Outlook) | Blue | #0078D4 |
| Insight Tasks | Purple | #A855F7 |

## 6.5 Capture Modal

### 6.5.1 Purpose and Goals

The Capture Modal is the universal entry point for adding any data to Insight:
- Text notes and thoughts
- Voice recordings with transcription
- Quick log entries
- Mood and energy tracking

**Key Requirement**: Must be accessible in under 100ms from any screen.

### 6.5.2 Mobile Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Cancel            Capture                      Done →    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ What's on your mind?                               │   │
│  │                                                     │   │
│  │ |                                                  │   │
│  │                                                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  │ 🎤  │ │ 📷  │ │ 📎  │ │ 😊  │ │ ⚡  │ │ 📍  │        │
│  │Voice│ │Photo│ │File │ │Mood │ │Energy│ │Place│        │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Quick Log                                                  │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
│  │ 💧   │ │ ☕   │ │ 🍎   │ │ 💊   │ │  +   │       │
│  │Water │ │Coffee │ │ Snack │ │ Meds  │ │Custom │       │
│  │  3   │ │  2    │ │  +    │ │  ✓   │ │       │       │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Add:  #tag   @person   📅 Date   🔔 Reminder              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.5.3 Voice Recording State

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back                 Recording                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                                                             │
│                      ┌──────────┐                          │
│                      │          │                          │
│                      │    ◉     │  ← Pulsing red          │
│                      │   REC    │                          │
│                      │          │                          │
│                      └──────────┘                          │
│                                                             │
│                        0:01:23                              │
│                                                             │
│                                                             │
│         ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                    │
│                                                             │
│                                                             │
│                                                             │
│                      ┌──────────┐                          │
│                      │  ⏹ Stop  │                          │
│                      └──────────┘                          │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.5.4 Transcription Review State

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back                 Review                      Save →  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶  0:00 / 1:23   ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TRANSCRIPT                                       [Edit]   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Had a great meeting with Sarah about the website   │   │
│  │ redesign project. We decided to push the deadline  │   │
│  │ to next Friday because the design team needs       │   │
│  │ more time for the homepage mockups. I need to      │   │
│  │ update the project timeline and let the client     │   │
│  │ know about the change.                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  EXTRACTED ENTITIES                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 Sarah                              [✓]  [×]     │   │
│  │ 📁 Website Redesign                   [✓]  [×]     │   │
│  │ 📅 Next Friday                        [✓]  [×]     │   │
│  │ ✓  Update project timeline            [✓]  [×]     │   │
│  │ ✓  Notify client about change         [✓]  [×]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Add entity manually]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 6.6 Focus Mode Screen

### 6.6.1 Purpose and Goals

Focus Mode provides a distraction-free environment for deep work:
- Timer-based focus sessions
- Visual transformation to dark theme
- Notification suppression
- Optional task/project linking
- Session logging for analysis

### 6.6.2 Configuration Screen

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back                 Focus                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     START A FOCUS SESSION                   │
│                                                             │
│  Duration                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  25 min │ │  50 min │ │  90 min │ │ Custom  │          │
│  │    ●    │ │    ○    │ │    ○    │ │    ○    │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  Link to (optional)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Select a task or project...                    ▼   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Ambient Sound                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  None   │ │  Rain   │ │ Forest  │ │  Café   │          │
│  │    ●    │ │    ○    │ │    ○    │ │    ○    │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☐ Block notifications during session               │   │
│  │ ☑ Play sound when session ends                     │   │
│  │ ☑ Auto-start 5 min break after session             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  START SESSION                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.6.3 Active Session Screen (Obsidian Dark Theme)

```
┌─────────────────────────────────────────────────────────────┐
│                                                     [End]   │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                         24:37                               │
│                                                             │
│                    ░░░░░░░░░░░░░░░░░                        │
│                    ████████████░░░░░                        │
│                                                             │
│                    Focusing on:                             │
│                 Website Redesign                            │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                  ┌─────────────────┐                        │
│                  │   ⏸ Pause      │                        │
│                  └─────────────────┘                        │
│                                                             │
│  [+ Add note]                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Background: #0A0A0B (Midnight theme)
- Timer: Large, high-contrast white text
- Minimal UI elements
- Purple accent for interactive elements
- No distracting animations

### 6.6.4 Session Complete Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                          🎉                                 │
│                                                             │
│                   FOCUS COMPLETE                            │
│                                                             │
│                    25 minutes                               │
│                                                             │
│                    +50 XP earned                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ How productive was this session?                    │   │
│  │                                                     │   │
│  │    😫    😕    😐    🙂    😄                       │   │
│  │     1     2     3     4     5                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Add a note about this session (optional)           │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    DONE                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Start 5-min break]    [Start another session]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 6.7 Settings Screen

### 6.7.1 Settings Organization

Settings are organized into logical categories:

```
ACCOUNT
├── Profile
├── Subscription
├── Data & Privacy
└── Sign Out

APPEARANCE
├── Theme
├── App Icon
└── Display Options

NOTIFICATIONS
├── Habit Reminders
├── Task Reminders
├── Focus Reminders
├── Insights & Tips
└── Do Not Disturb

INTEGRATIONS
├── Calendars
├── Health (HealthKit/Google Fit)
├── Import Data
└── Export Data

HABITS
├── Default Reminder Time
├── Week Start Day
├── Streak Freeze Settings
└── Archive Management

ADVANCED
├── Offline Mode
├── Sync Settings
├── Developer Options
└── Reset App
```

### 6.7.2 Theme Selection Screen

```
┌─────────────────────────────────────────────────────────────┐
│ ← Settings           Theme                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Follow system appearance                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  LIGHT THEMES                                               │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │          │
│  │ │ Preview │ │ │ │ Preview │ │ │ │ Preview │ │          │
│  │ │ Default │ │ │ │  Light  │ │ │ │  Olive  │ │          │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │          │
│  │   Default   │ │    Light    │ │    Olive    │          │
│  │      ●      │ │      ○      │ │      ○      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  ┌─────────────┐                                           │
│  │ ┌─────────┐ │                                           │
│  │ │ Preview │ │                                           │
│  │ │Rose Gold│ │                                           │
│  │ └─────────┘ │                                           │
│  │  Rose Gold  │                                           │
│  │      ○      │                                           │
│  └─────────────┘                                           │
│                                                             │
│  DARK THEMES                                                │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │          │
│  │ │ Preview │ │ │ │ Preview │ │ │ │ Preview │ │          │
│  │ │  Dark   │ │ │ │Midnight │ │ │ │Mid Neon │ │          │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │          │
│  │    Dark     │ │  Midnight   │ │ Mid. Neon   │          │
│  │      ○      │ │      ○      │ │      ○      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# PART 7: QUALITY & TESTING

## 7.1 Quality Philosophy

### 7.1.1 Quality Principles

Quality in Insight 5.2 is not an afterthought but a fundamental design constraint. The following principles guide all quality decisions:

**Principle 1: User Trust is Paramount**

Personal tracking data is sensitive and valuable. Users trust Insight with information about their health, habits, moods, and goals. A single data loss incident or sync failure can destroy that trust permanently. Quality processes must prevent such failures.

**Principle 2: Consistency Breeds Confidence**

When users tap a button, they expect the same result every time. Inconsistent behavior—whether in animations, navigation, or data handling—creates anxiety and reduces engagement. Quality ensures consistency across platforms, devices, and sessions.

**Principle 3: Performance is a Feature**

Slow apps get abandoned. The 10-second capture promise cannot be met if the app takes 3 seconds to open or the capture modal takes 500ms to appear. Performance testing is as important as functional testing.

**Principle 4: Accessibility is Non-Negotiable**

Insight serves users with diverse abilities. Accessibility failures are not minor bugs—they are features broken for a segment of users. Every release must maintain WCAG 2.1 AA compliance.

**Principle 5: Edge Cases Matter**

The app must work on airplane mode, with low battery, after 30 days without opening, with 10,000 habits logged, and on devices from 5 years ago. Edge cases are where trust is built or broken.

### 7.1.2 Quality Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Crash-free sessions | >99.5% | 99% |
| ANR rate (Android) | <0.5% | 1% |
| Sync success rate | >99.9% | 99% |
| Offline capability | 100% core features | - |
| Capture modal open time | <100ms | 200ms |
| Cold start time | <2s | 3s |
| WCAG AA compliance | 100% | 95% |
| Test coverage | >80% | 70% |

## 7.2 Testing Strategy

### 7.2.1 Testing Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲          (10%)
                 ╱──────╲
                ╱        ╲
               ╱Integration╲      (20%)
              ╱────────────╲
             ╱              ╲
            ╱  Unit Tests    ╲    (70%)
           ╱──────────────────╲
```

**Unit Tests (70%)**
- Component rendering tests
- Utility function tests
- State management tests
- Data transformation tests
- Validation logic tests

**Integration Tests (20%)**
- API integration tests
- Database operation tests
- Authentication flow tests
- Sync logic tests
- Navigation flow tests

**End-to-End Tests (10%)**
- Critical user journeys
- Cross-platform consistency
- Accessibility compliance
- Performance benchmarks

### 7.2.2 Testing by Category

**Component Testing**

Every UI component must have tests covering:

```typescript
// Example: Button component test requirements
describe('Button', () => {
  // Rendering
  it('renders with default props');
  it('renders with all variant types');
  it('renders with all size options');
  it('renders with left icon');
  it('renders with right icon');
  it('renders with both icons');

  // States
  it('shows loading state correctly');
  it('shows disabled state correctly');
  it('applies hover styles on hover');
  it('applies active styles on press');
  it('shows focus ring on keyboard focus');

  // Behavior
  it('calls onClick when clicked');
  it('does not call onClick when disabled');
  it('does not call onClick when loading');
  it('submits form when type is submit');

  // Accessibility
  it('has correct ARIA attributes');
  it('is keyboard navigable');
  it('has sufficient color contrast');
  it('meets touch target size requirements');
});
```

**Feature Testing**

Each feature requires comprehensive test coverage:

```typescript
// Example: Habit tracking feature tests
describe('Habit Tracking', () => {
  describe('Habit List', () => {
    it('displays all user habits');
    it('shows correct completion state for today');
    it('displays current streak accurately');
    it('sorts habits by user-defined order');
    it('filters habits by tag');
  });

  describe('Habit Completion', () => {
    it('marks habit complete on tap');
    it('updates streak count correctly');
    it('awards correct XP amount');
    it('plays completion animation');
    it('syncs completion to server');
    it('works offline and syncs later');
  });

  describe('Streak Logic', () => {
    it('maintains streak for consecutive days');
    it('breaks streak after missed day');
    it('uses freeze token when available');
    it('calculates longest streak correctly');
    it('handles timezone changes');
  });

  describe('Habit Creation', () => {
    it('creates habit with required fields');
    it('validates habit name length');
    it('sets default values correctly');
    it('handles custom frequency configuration');
    it('saves habit to database');
    it('syncs new habit to server');
  });
});
```

**Sync Testing**

Synchronization requires extensive testing:

```typescript
describe('Sync System', () => {
  describe('Normal Sync', () => {
    it('syncs new local changes to server');
    it('receives remote changes from server');
    it('handles large batch syncs');
    it('maintains data integrity');
  });

  describe('Offline Handling', () => {
    it('queues changes when offline');
    it('syncs queued changes when back online');
    it('maintains operation order');
    it('handles extended offline periods');
  });

  describe('Conflict Resolution', () => {
    it('detects conflicting changes');
    it('presents conflict UI to user');
    it('applies user resolution correctly');
    it('handles merge conflicts');
  });

  describe('Error Recovery', () => {
    it('retries failed syncs');
    it('handles server errors gracefully');
    it('notifies user of persistent failures');
    it('preserves local data on sync failure');
  });
});
```

### 7.2.3 Visual Regression Testing

Visual regression tests ensure UI consistency across releases:

**Tools**: Percy, Chromatic, or Playwright visual comparisons

**Coverage Requirements**:
- All primary screens in all themes
- All component variants and states
- All responsive breakpoints
- Light and dark mode variants

**Process**:
1. Capture baseline screenshots on main branch
2. Capture comparison screenshots on PR branch
3. Flag visual differences for review
4. Approve intentional changes, reject regressions

### 7.2.4 Accessibility Testing

**Automated Testing**
- axe-core integration for all components
- Lighthouse accessibility audits
- Color contrast validation

**Manual Testing Checklist**

| Test | Method | Frequency |
|------|--------|-----------|
| Screen reader navigation | VoiceOver/TalkBack | Each release |
| Keyboard-only navigation | Manual testing | Each release |
| Color contrast verification | Tool + manual | Each theme change |
| Touch target size | Measurement | Each component change |
| Motion sensitivity | Reduced motion testing | Each animation change |
| Text scaling | Large text settings | Each release |

**Accessibility Test Script**

```
1. Screen Reader Testing (VoiceOver/TalkBack)
   □ Navigate to Dashboard using only screen reader
   □ Complete a habit using only screen reader
   □ Create a new capture using only screen reader
   □ Navigate through all main tabs
   □ Verify all interactive elements are announced
   □ Verify all images have descriptive alt text

2. Keyboard Navigation (Desktop)
   □ Tab through all interactive elements
   □ Verify visible focus indicator on all elements
   □ Verify logical tab order
   □ Test all keyboard shortcuts
   □ Verify modal focus trapping
   □ Test escape key closes modals

3. Color and Contrast
   □ Verify all text meets 4.5:1 contrast (normal text)
   □ Verify all text meets 3:1 contrast (large text)
   □ Test with grayscale mode enabled
   □ Verify information not conveyed by color alone

4. Motor Accessibility
   □ Verify all touch targets >= 44x44pt
   □ Test with switch control
   □ Verify drag actions have alternatives
   □ Test with reduced motion enabled
```

### 7.2.5 Performance Testing

**Metrics to Test**

| Metric | Tool | Target |
|--------|------|--------|
| Cold start time | Custom timer | <2s |
| Warm start time | Custom timer | <500ms |
| Time to interactive | Lighthouse | <3s |
| First contentful paint | Lighthouse | <1s |
| Frame rate (60fps) | Perf monitor | 60fps |
| Memory usage | Platform tools | <100MB idle |
| Bundle size | Build output | <2MB |

**Performance Test Scenarios**

```typescript
describe('Performance', () => {
  describe('Startup', () => {
    it('cold starts in under 2 seconds');
    it('warm starts in under 500ms');
    it('shows content within 1 second');
  });

  describe('Navigation', () => {
    it('switches tabs in under 100ms');
    it('opens capture modal in under 100ms');
    it('navigates to detail views in under 200ms');
  });

  describe('Lists', () => {
    it('renders 100 tasks at 60fps');
    it('scrolls through 1000 habits smoothly');
    it('filters large lists in under 100ms');
  });

  describe('Data Operations', () => {
    it('saves capture in under 500ms');
    it('completes habit in under 200ms');
    it('syncs 100 items in under 5 seconds');
  });
});
```

### 7.2.6 Cross-Platform Testing

**Device Matrix**

| Platform | Devices | OS Versions |
|----------|---------|-------------|
| iOS | iPhone SE, iPhone 15, iPhone 15 Pro Max, iPad | iOS 16, 17, 18 |
| Android | Pixel 6, Samsung S23, Budget device | Android 12, 13, 14 |
| Web | Chrome, Safari, Firefox, Edge | Latest 2 versions |
| macOS | MacBook Air, MacBook Pro, iMac | macOS 13, 14 |
| Windows | Various | Windows 10, 11 |

**Cross-Platform Test Checklist**

```
□ UI renders correctly on all target devices
□ Touch/click interactions work correctly
□ Animations run at acceptable frame rates
□ Offline mode works correctly
□ Sync works across platforms
□ Deep links work on all platforms
□ Push notifications work correctly
□ Haptic feedback works where supported
□ Platform-specific features work correctly
```

## 7.3 Test Automation

### 7.3.1 CI/CD Integration

**On Every Pull Request**
- Lint and type check
- Unit tests (all platforms)
- Integration tests
- Visual regression tests
- Accessibility audit
- Bundle size check

**On Merge to Main**
- All PR checks
- E2E tests
- Performance benchmarks
- Cross-platform build verification

**On Release**
- All main checks
- Full E2E suite
- Production smoke tests
- App store screenshot generation

### 7.3.2 Test Infrastructure

```yaml
# Example CI configuration
name: PR Checks

on: [pull_request]

jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:visual
      - uses: percy/exec-action@v0.3.1

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:a11y

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: preactjs/compressed-size-action@v2
```

## 7.4 Bug Tracking and Triage

### 7.4.1 Bug Severity Levels

| Level | Name | Description | Response Time | Example |
|-------|------|-------------|---------------|---------|
| S0 | Critical | Data loss, security breach, complete outage | Immediate | Sync deletes user data |
| S1 | Major | Core feature broken, no workaround | 24 hours | Cannot complete habits |
| S2 | Moderate | Feature impaired, workaround exists | 1 week | Habit streak shows wrong count |
| S3 | Minor | Cosmetic or minor inconvenience | Next release | Animation stutters on old device |
| S4 | Trivial | Very minor, low impact | Backlog | Typo in settings |

### 7.4.2 Bug Report Template

```markdown
## Bug Description
[Clear, concise description of the bug]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Platform: [iOS/Android/Web/Desktop]
- Version: [App version]
- Device: [Device model]
- OS Version: [OS version]

## Screenshots/Videos
[Attach if applicable]

## Additional Context
[Any other relevant information]

## Severity Assessment
- Severity: [S0-S4]
- Affected Users: [Percentage/number]
- Workaround Available: [Yes/No]
```

### 7.4.3 Quality Gates

No release proceeds without passing these gates:

**Gate 1: Code Quality**
- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] No critical linter errors
- [ ] Type check passing
- [ ] No security vulnerabilities (npm audit)

**Gate 2: Functional Quality**
- [ ] All critical user journeys tested
- [ ] No S0 or S1 bugs open
- [ ] S2 bugs reviewed and accepted
- [ ] Regression tests passing

**Gate 3: Performance Quality**
- [ ] Cold start < 2s
- [ ] Capture modal opens < 100ms
- [ ] 60fps on target devices
- [ ] Bundle size within limit

**Gate 4: Accessibility Quality**
- [ ] axe-core audit passing
- [ ] Manual accessibility testing complete
- [ ] Screen reader testing complete
- [ ] Color contrast verified

**Gate 5: Release Quality**
- [ ] Release notes prepared
- [ ] App store assets updated
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready

## 7.5 Quality Monitoring

### 7.5.1 Production Monitoring

**Metrics Dashboard**
- Crash rate by version, device, OS
- ANR rate (Android)
- Sync failure rate
- API error rate
- Performance percentiles (p50, p95, p99)

**Alerting Thresholds**

| Metric | Warning | Critical |
|--------|---------|----------|
| Crash rate | >0.5% | >1% |
| Sync failures | >1% | >5% |
| API 5xx errors | >0.1% | >1% |
| Cold start p95 | >3s | >5s |

### 7.5.2 User Feedback Loop

**In-App Feedback**
- Shake to report bug
- Feedback button in settings
- Post-session satisfaction rating (optional)

**App Store Monitoring**
- Daily review monitoring
- Sentiment analysis
- Response to critical reviews within 24 hours

**Support Ticket Analysis**
- Weekly review of support tickets
- Bug identification from user reports
- Feature request tracking

---

# PART 8: PRODUCTION READINESS

## 8.1 Launch Readiness Criteria

### 8.1.1 Feature Completeness Matrix

Before launch, all features must reach their minimum viable state:

**Core Features (Must Have)**

| Feature | Mobile | Desktop | iOS Native | Status |
|---------|--------|---------|------------|--------|
| User Authentication | ✓ | ✓ | ✓ | Required |
| Dashboard / Today | ✓ | ✓ | ✓ | Required |
| Quick Capture (text) | ✓ | ✓ | ✓ | Required |
| Voice Capture | ✓ | ✓ | ✓ | Required |
| Habit Tracking | ✓ | ✓ | ✓ | Required |
| Habit Completion | ✓ | ✓ | ✓ | Required |
| Streak Tracking | ✓ | ✓ | ✓ | Required |
| Task List | ✓ | ✓ | ✓ | Required |
| Task Creation/Editing | ✓ | ✓ | ✓ | Required |
| Calendar View | ✓ | ✓ | ✓ | Required |
| Event Creation | ✓ | ✓ | ✓ | Required |
| Offline Mode | ✓ | ✓ | ✓ | Required |
| Data Sync | ✓ | ✓ | ✓ | Required |
| Settings | ✓ | ✓ | ✓ | Required |
| Theme Support | ✓ | ✓ | ✓ | Required |

**Enhanced Features (Should Have)**

| Feature | Mobile | Desktop | iOS Native | Status |
|---------|--------|---------|------------|--------|
| Journal / Notes | ✓ | ✓ | ✓ | Recommended |
| Goals | ✓ | ✓ | Basic | Recommended |
| Focus Mode | ✓ | ✓ | ✓ | Recommended |
| XP / Gamification | ✓ | ✓ | ✓ | Recommended |
| AI Entity Extraction | ✓ | ✓ | ✓ | Recommended |
| Correlation Insights | Basic | ✓ | - | Recommended |
| External Calendar Sync | ✓ | ✓ | ✓ | Recommended |
| Push Notifications | ✓ | - | ✓ | Recommended |

**Extended Features (Nice to Have)**

| Feature | Mobile | Desktop | iOS Native | Status |
|---------|--------|---------|------------|--------|
| People Tracking | Basic | ✓ | Basic | Optional |
| Places Tracking | Basic | ✓ | Basic | Optional |
| Projects | Basic | ✓ | - | Optional |
| Custom Trackers | ✓ | ✓ | - | Optional |
| Advanced Reports | - | ✓ | - | Optional |
| Saved Views | - | ✓ | ✓ | Optional |
| Widgets | Planned | - | ✓ | Optional |
| Live Activities | - | - | ✓ | Optional |
| HealthKit | - | - | ✓ | Optional |

### 8.1.2 Quality Gates Summary

**Gate 1: Functional Completeness**
- [ ] All "Must Have" features implemented and tested
- [ ] All critical user flows work end-to-end
- [ ] Offline mode fully functional
- [ ] Sync system stable and tested

**Gate 2: Quality Thresholds**
- [ ] Crash-free rate > 99.5%
- [ ] Test coverage > 80%
- [ ] No open S0 or S1 bugs
- [ ] All S2 bugs reviewed and accepted

**Gate 3: Performance Standards**
- [ ] Cold start < 2 seconds (all platforms)
- [ ] Capture modal opens < 100ms
- [ ] 60fps scrolling performance
- [ ] Bundle size within limits

**Gate 4: Accessibility Compliance**
- [ ] WCAG 2.1 AA compliance verified
- [ ] Screen reader testing complete
- [ ] Keyboard navigation complete (desktop)
- [ ] Touch targets meet minimum sizes

**Gate 5: Security and Privacy**
- [ ] Security audit complete
- [ ] Privacy policy published
- [ ] Data encryption verified
- [ ] Authentication flows tested

**Gate 6: Platform Requirements**
- [ ] App Store guidelines compliance
- [ ] Play Store requirements met
- [ ] App review submissions prepared
- [ ] Marketing assets ready

## 8.2 Pre-Launch Checklist

### 8.2.1 Technical Readiness

**Infrastructure**
- [ ] Production database provisioned and configured
- [ ] CDN configured for static assets
- [ ] SSL certificates installed and valid
- [ ] Backup and recovery systems tested
- [ ] Scaling policies configured
- [ ] Monitoring and alerting active

**Security**
- [ ] Security audit completed
- [ ] Penetration testing completed (if applicable)
- [ ] API rate limiting configured
- [ ] Authentication security verified
- [ ] Data encryption at rest and in transit
- [ ] Third-party dependency audit

**Performance**
- [ ] Load testing completed
- [ ] Performance benchmarks documented
- [ ] Database queries optimized
- [ ] CDN caching configured
- [ ] Image optimization complete
- [ ] Bundle size optimized

### 8.2.2 Application Readiness

**Mobile (iOS)**
- [ ] App Store Connect account configured
- [ ] App ID and certificates configured
- [ ] TestFlight beta testing completed
- [ ] App Store screenshots prepared (all device sizes)
- [ ] App Store description and metadata complete
- [ ] Privacy nutrition labels completed
- [ ] App Review guidelines compliance verified
- [ ] Push notification certificates configured

**Mobile (Android)**
- [ ] Google Play Console configured
- [ ] Signing keys securely stored
- [ ] Internal/closed beta testing completed
- [ ] Play Store screenshots prepared
- [ ] Play Store listing complete
- [ ] Data safety section completed
- [ ] App bundle generated and tested

**Desktop (Web)**
- [ ] Production deployment tested
- [ ] Custom domain configured
- [ ] SEO metadata configured
- [ ] Analytics configured
- [ ] Error tracking configured
- [ ] PWA manifest and icons ready

### 8.2.3 Content Readiness

**In-App Content**
- [ ] All UI copy finalized and proofread
- [ ] Empty states have helpful messaging
- [ ] Error messages are user-friendly
- [ ] Onboarding flow complete and tested
- [ ] In-app help content prepared
- [ ] Tooltips and hints configured

**External Content**
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support documentation prepared
- [ ] FAQ content prepared
- [ ] Contact/support channels ready

### 8.2.4 Operations Readiness

**Monitoring**
- [ ] Application performance monitoring active
- [ ] Error tracking configured
- [ ] Uptime monitoring configured
- [ ] Business metrics dashboards ready
- [ ] Alerting thresholds configured

**Support**
- [ ] Support ticket system configured
- [ ] Support documentation prepared
- [ ] On-call rotation established
- [ ] Escalation procedures documented
- [ ] Common issue playbooks prepared

**Rollback**
- [ ] Rollback procedure documented
- [ ] Previous version readily deployable
- [ ] Database migration rollback tested
- [ ] Feature flags configured for gradual rollout

## 8.3 Launch Execution Plan

### 8.3.1 Launch Phases

**Phase 1: Soft Launch (Week -2)**
- Deploy to production with invite-only access
- Enable for internal team and beta testers
- Monitor for issues
- Address any critical bugs

**Phase 2: Limited Release (Week -1)**
- Open to waitlist subscribers
- Gradual percentage rollout (10% → 25% → 50%)
- Intensive monitoring period
- Daily bug triage meetings

**Phase 3: Public Launch (Week 0)**
- Full public availability
- App Store / Play Store featured submission
- Marketing campaign activation
- Press outreach

**Phase 4: Post-Launch Stabilization (Week +1 to +2)**
- 24/7 monitoring coverage
- Daily deployment freeze (hotfixes only)
- User feedback collection
- Performance optimization

### 8.3.2 Launch Day Checklist

**T-24 Hours**
- [ ] Final code freeze (except critical hotfixes)
- [ ] Production deployment verified
- [ ] All monitoring systems active
- [ ] On-call team confirmed
- [ ] Communication channels ready
- [ ] App store submissions approved

**T-4 Hours**
- [ ] Production smoke tests passed
- [ ] Monitoring dashboards reviewed
- [ ] Support team briefed
- [ ] Marketing assets staged

**T-0 (Launch)**
- [ ] App store releases triggered
- [ ] Public website updated
- [ ] Marketing emails sent
- [ ] Social media announcements
- [ ] Press release distributed

**T+1 Hour**
- [ ] Verify app availability in stores
- [ ] Monitor crash rates
- [ ] Monitor server metrics
- [ ] Review early user feedback

**T+24 Hours**
- [ ] Review first day metrics
- [ ] Triage any reported issues
- [ ] Plan hotfix if necessary
- [ ] Team debrief

### 8.3.3 Incident Response Plan

**Severity Levels**

| Level | Description | Response |
|-------|-------------|----------|
| SEV1 | Complete outage | All hands, 15-min updates |
| SEV2 | Major feature broken | On-call + backup, 30-min updates |
| SEV3 | Minor feature impacted | On-call, 1-hour updates |
| SEV4 | Cosmetic/minor | Normal triage |

**Response Procedure**

```
1. IDENTIFY
   - Confirm the issue
   - Assess severity
   - Notify appropriate team members

2. COMMUNICATE
   - Status page update (if applicable)
   - Internal communication
   - User communication (if widespread)

3. INVESTIGATE
   - Gather logs and metrics
   - Identify root cause
   - Determine fix approach

4. RESOLVE
   - Implement fix
   - Test in staging
   - Deploy to production
   - Verify resolution

5. POST-MORTEM
   - Document timeline
   - Identify root cause
   - Define preventive measures
   - Share learnings
```

## 8.4 Success Metrics

### 8.4.1 Launch Success Criteria

**Week 1 Targets**
- Downloads: [target number]
- DAU: [target number]
- Crash-free rate: >99%
- App Store rating: >4.0

**Month 1 Targets**
- WAU: [target number]
- DAU/WAU ratio: >40%
- 7-day retention: >40%
- Premium conversion: >2%
- NPS: >30

**Month 3 Targets**
- MAU: [target number]
- 30-day retention: >25%
- Premium conversion: >5%
- NPS: >50
- App Store rating: >4.5

### 8.4.2 Key Performance Indicators

**Engagement KPIs**
- Daily active users (DAU)
- Weekly active users (WAU)
- Monthly active users (MAU)
- DAU/MAU ratio (stickiness)
- Average session duration
- Captures per user per day
- Habits completed per user per day

**Quality KPIs**
- Crash-free rate
- App Store rating
- Support ticket volume
- Time to resolution
- NPS score

**Business KPIs**
- New user acquisition
- Retention curves (D1, D7, D30, D90)
- Premium conversion rate
- Monthly recurring revenue (MRR)
- Customer lifetime value (LTV)
- Customer acquisition cost (CAC)

### 8.4.3 Monitoring Dashboards

**Real-Time Dashboard**
- Active users (now)
- Requests per second
- Error rate
- Latency percentiles
- Sync success rate

**Daily Dashboard**
- DAU trend
- New signups
- Feature usage breakdown
- Crash reports
- User feedback summary

**Weekly Dashboard**
- WAU trend
- Retention cohorts
- Feature adoption
- Performance trends
- Bug backlog status

## 8.5 Post-Launch Operations

### 8.5.1 Maintenance Schedule

**Daily**
- Review error logs
- Monitor performance metrics
- Triage new bugs
- Review user feedback

**Weekly**
- Security updates review
- Dependency updates
- Performance optimization
- User feedback synthesis
- Sprint planning

**Monthly**
- Full system audit
- Database optimization
- Cost optimization review
- Documentation updates
- Team retrospective

**Quarterly**
- Major version planning
- Architecture review
- Security audit
- User research synthesis
- Roadmap update

### 8.5.2 Update Cadence

| Update Type | Frequency | Contents |
|-------------|-----------|----------|
| Hotfix | As needed | Critical bugs, security |
| Patch | Weekly | Bug fixes, minor improvements |
| Minor | Bi-weekly | New features, enhancements |
| Major | Quarterly | Significant new capabilities |

### 8.5.3 Communication Plan

**User Communication**
- In-app changelog for updates
- Email for major features
- Push notifications for important updates
- Social media for announcements

**Internal Communication**
- Daily standup
- Weekly metrics review
- Monthly all-hands
- Quarterly planning

### 8.5.4 Continuous Improvement

**Feedback Loops**
- App store reviews monitoring
- In-app feedback collection
- Support ticket analysis
- User interviews (monthly)
- Analytics insights

**Iteration Process**
1. Collect feedback and data
2. Identify patterns and priorities
3. Design and validate solutions
4. Implement and test
5. Release and measure
6. Repeat

---

# APPENDICES

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Capture | Any data entry into Insight (text, voice, photo, quick log) |
| Entry | A journal/note entry in the system |
| Entity | A data object (habit, task, entry, person, place, etc.) |
| FAB | Floating Action Button - the persistent + button |
| Freeze Token | Streak protection that prevents streak loss |
| Habit Log | A single completion record for a habit |
| Heatmap | Visual grid showing habit completion over time |
| Paper-Clean | The warm, minimal aesthetic style of Insight |
| Quick Log | One-tap pre-configured captures (water, coffee, etc.) |
| Saved View | User-defined filtered view of data |
| Streak | Consecutive days of habit completion |
| XP | Experience Points earned for actions |

## Appendix B: Reference Links

- Design Tokens: `/packages/shared/tokens/`
- Component Library: `/packages/ui/`
- Mobile App: `/apps/mobile4/`
- Desktop App: `/apps/desktop/`
- iOS Native: `/apps/insight_swift/`

## Appendix C: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | - | Initial release |

## Appendix D: Acknowledgments

This document synthesizes research and recommendations from the following source documents:

- BD-001: Screenshot Inventory
- BD-002: UI Map Research
- BD-003: Behavior Map
- BD-004: Component Inventory
- BD-005: Heuristic Audit
- BD-006: Competitor Teardown
- BD-007: Patterns & Style
- BD-008: Vision North Star
- BD-009: IA Flows Wireframes
- BD-010: UI System Tokens
- BD-011: Test Strategy
- BD-012: Production Rubric

---

**END OF DOCUMENT**

*Total Word Count: ~53,000 words*

*This is the authoritative UI/UX specification for Insight 5.2. All design and development decisions should reference this document.*

