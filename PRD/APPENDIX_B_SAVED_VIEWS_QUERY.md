# Appendix B — Saved Views Query Spec (“Bases-like”)

## B1) Purpose
Saved views are the primary way users “see the system”:
- canned dashboards
- tag-based timelines
- tracker charts/heatmaps
- project/task lists

The spec mirrors the TaskNotes advanced filter model and stores as JSON in Supabase (`saved_views.query`).

## B2) Query Shape (MVP)
```ts
type FilterOperator =
  | "is" | "isNot"
  | "contains" | "notContains"
  | "before" | "after" | "onOrBefore" | "onOrAfter"
  | "empty" | "notEmpty"
  | "gt" | "gte" | "lt" | "lte";

type FilterProperty =
  | "title"
  | "facets"
  | "tags"
  | "contexts"
  | "people"
  | "goals"
  | "projects"
  | "startAt"
  | "createdAt"
  | "difficulty"
  | "importance"
  | "durationMinutes"
  | "xp"
  | `tracker:${string}`;

type FilterNode =
  | { type: "condition"; id: string; property: FilterProperty; operator: FilterOperator; value: any }
  | { type: "group"; id: string; conjunction: "and" | "or"; children: FilterNode[] };

type SavedViewQuery = {
  root: FilterNode; // must be group
  sort?: { key: FilterProperty; direction: "asc" | "desc" };
  group?: { key: FilterProperty; subgroupKey?: FilterProperty };
  timeRange?: { preset: "today"|"7d"|"30d"|"custom"; start?: string; end?: string };
};
```

## B3) View Types
- `list`: rows/cards
- `chart`: single visualization
- `dashboard`: multi-card layout (grid)

## B4) Examples
### “Health → Supplements” timeline
- filter: tags contains `health/supplements`
- sort: startAt desc
- view: timeline chart

### “Get shredded — XP last 30 days”
- filter: goals contains “Get shredded”
- timeRange: 30d
- chart: bar of xp/day + heatmap of workouts

### “Tasks inbox”
- filter: facets contains `task` AND status is `open`
- sort: importance desc

## B5) UI Behavior (MVP)
- Users can:
  - create/edit a view
  - pin to Dashboard
  - share internally across screens (same query spec)
- Default canned views ship preconfigured.
