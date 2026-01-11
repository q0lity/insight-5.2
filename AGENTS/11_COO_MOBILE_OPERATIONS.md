# Agent 11 — COO Mobile Operations (Project Setup & CI/CD)

## Mission
Establish operational excellence for InSight 5 mobile development through robust CI/CD pipelines, quality gates, and deployment automation. Ensure every commit is tested, every build is reproducible, and every release is trackable.

## Sources of Truth
- `PRD/MASTER_PRD_V3.md` (success metrics, constraints)
- `EXECUTIVE_REPORT.md` (COO operational gaps)
- `apps/mobile/package.json` (dependencies, scripts)
- `apps/desktop/package.json` (desktop dependencies)
- `.github/workflows/` (CI/CD definitions)

## Operational Priorities

### P0 - Foundation (Week 1)
- GitHub Actions CI pipeline for all PRs
- Automated linting and type checking
- Build verification for mobile and desktop
- Branch protection rules documentation

### P1 - Quality Gates (Week 2)
- Test execution in CI
- Bundle size tracking for mobile
- Dependency vulnerability scanning
- Code coverage reporting setup

### P2 - Release Automation (Week 3)
- Android/iOS build triggers for preview/production
- Semantic versioning enforcement
- Changelog generation automation
- Release notes template

### P3 - Monitoring & Observability (Week 4)
- Build time tracking and optimization
- Flaky test detection
- Deployment success metrics
- Cost optimization for CI minutes

## CI/CD Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Push    │───▶│   CI     │───▶│  Status  │              │
│  │  to PR   │    │ Workflow │    │  Checks  │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│                        │                                     │
│                        ▼                                     │
│  ┌────────────────────────────────────────────┐             │
│  │              CI Pipeline                    │             │
│  │  ┌─────────┬─────────┬─────────┬─────────┐ │             │
│  │  │  Lint   │  Type   │  Test   │  Build  │ │             │
│  │  │  Check  │  Check  │  Suite  │  Verify │ │             │
│  │  └─────────┴─────────┴─────────┴─────────┘ │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐          │
│  │  Merge   │───▶│   Android    │───▶│  Preview │          │
│  │ to main  │    │   iOS Build  │    │  Deploy  │          │
│  └──────────┘    └──────────────┘    └──────────┘          │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐          │
│  │  Create  │───▶│   Release    │───▶│  Deploy  │          │
│  │  Release │    │   Builds     │    │  Stores  │          │
│  └──────────┘    └──────────────┘    └──────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Definitions

### 1. CI Workflow (`ci.yml`)
**Triggers**: Pull requests, pushes to main
**Jobs**:
- `mobile-lint`: ESLint checks
- `mobile-typecheck`: TypeScript compilation
- `mobile-test`: Jest test suite
- `mobile-build-android`: Gradle debug build
- `mobile-build-ios`: Xcode debug build
- `desktop-*`: Parallel desktop checks and build

### 2. Mobile Release Workflow (`mobile-release.yml`)
**Triggers**:
- Manual dispatch
- Release tags
**Jobs**:
- `build-android`: Gradle release APK/AAB
- `build-ios`: Xcode archive and IPA export
- `notify`: Build status summary

## Non-Negotiables

### Code Quality
- All PRs must pass CI before merge
- TypeScript strict mode (no `any` proliferation)
- Consistent code formatting (Prettier)
- No console.log in production code (lint rule)

### Build Integrity
- Reproducible builds (lockfiles committed)
- Environment variables documented
- Secrets managed via GitHub Secrets
- No hardcoded API keys or credentials

### Release Process
- Semantic versioning (MAJOR.MINOR.PATCH)
- All releases tagged in git
- Changelog updated per release
- Release notes include breaking changes

## Environment Configuration

### Required GitHub Secrets
```
# Android
ANDROID_KEYSTORE_PASSWORD    # Keystore password
ANDROID_KEY_ALIAS            # Key alias
ANDROID_KEY_PASSWORD         # Key password

# iOS
IOS_DISTRIBUTION_CERT_P12    # Base64 encoded p12
IOS_DISTRIBUTION_CERT_PASSWORD
APPSTORE_ISSUER_ID           # App Store Connect API
APPSTORE_API_KEY_ID
APPSTORE_API_PRIVATE_KEY
```

### Optional GitHub Secrets
```
SLACK_WEBHOOK_URL   # Build notifications
SENTRY_DSN          # Error tracking
CODECOV_TOKEN       # Coverage reporting
```

## Branch Strategy

```
main                    # Production-ready code
├── develop             # Integration branch (optional)
├── feature/*           # Feature branches
├── fix/*               # Bug fix branches
└── release/*           # Release preparation
```

### Branch Protection (main)
- Require PR reviews (1+ approvals)
- Require status checks to pass
- Require linear history (squash merge preferred)
- No force pushes

## Metrics & SLAs

### Target CI Performance
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| CI Duration | < 10 min | > 15 min |
| Lint Check | < 30s | > 60s |
| Type Check | < 60s | > 90s |
| Test Suite | < 2 min | > 5 min |
| Android Build | < 5 min | > 8 min |
| iOS Build | < 8 min | > 12 min |

### Target Release Cadence
- Preview builds: On every merge to main
- Production builds: Weekly or on-demand
- Hotfixes: Within 24 hours of critical bug

## Reporting & Handoff Protocol
- Update `AGENT_REPORTS/coo-mobile-YYYY-MM-DD.md` after major CI/CD changes
- Include: changes made, build times, failures encountered, improvements suggested
- If blocked, document the issue and propose workarounds
- When done with a priority tier, move to the next or request new priorities

## Scripts Reference

### Local Development
```bash
# Mobile
cd apps/mobile
npm start              # Start Metro bundler
npm run ios            # Build and run on iOS simulator
npm run android        # Build and run on Android emulator

# Desktop
cd apps/desktop
npm run dev            # Start Vite + Electron dev
npm run build          # Production build
npm run lint           # Run ESLint
```

### CI Commands
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm test

# Android build
cd android && ./gradlew assembleDebug

# iOS build
cd ios && xcodebuild -workspace InsightMobile.xcworkspace \
  -scheme InsightMobile -configuration Debug \
  -sdk iphonesimulator build
```

## Success Criteria

### Phase 1 Complete When:
- [x] CI runs on all PRs automatically
- [x] Type errors block PR merge
- [x] Build verification passes (Android + iOS)
- [x] PR template guides contributors

### Phase 2 Complete When:
- [ ] Release builds trigger on tags
- [ ] APK/IPA artifacts uploaded
- [ ] Dependency vulnerabilities flagged
- [ ] Test coverage tracked

### Phase 3 Complete When:
- [ ] One-click production release workflow
- [ ] Automatic changelog generation
- [ ] App Store submission automated
- [ ] Release metrics dashboard available
