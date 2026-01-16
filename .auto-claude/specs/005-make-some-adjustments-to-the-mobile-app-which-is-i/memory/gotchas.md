# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-13 17:05]
The spec references 'insight-mobile' but the actual app folder is 'mobile4'. Always use Glob to find the actual file paths before assuming the spec paths are correct.

_Context: When working on subtask-1-1 fixing the recording engine crash in voice.tsx_

## [2026-01-13 17:09]
The spec refers to the mobile app as 'insight-mobile' but the actual directory is 'apps/mobile4'. There are also mobile2 and mobile3 directories that appear to be older versions.

_Context: When looking for mobile app files for specs mentioning 'insight-mobile', always check apps/mobile4 as the actual path._

## [2026-01-13 17:42]
InsightIcon component doesn't have chevronRight icon - only chevronLeft is available. Check InsightIconName type for available icons before using.

_Context: apps/mobile4/src/components/InsightIcon.tsx defines limited icon set. Use 'dots' icon as alternative for detail/more indicator._
