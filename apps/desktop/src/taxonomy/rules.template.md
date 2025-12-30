# Taxonomy Rules (frontmatter template)

Add this block to a capture note if you want custom semantic routing. The rules get applied during capture parsing.

```yaml
---
# optional: category/subcategory and tags
rules:
  - match: "drive|commute|uber|lyft"
    category: "Transport"
    subcategory: "Driving"
    tags: ["#transport", "#commute"]
  - match: "flight|airport|tsa"
    category: "Transport"
    subcategory: "Flight"
    tags: ["#transport"]
  - match: "cardio|run|treadmill"
    category: "Health"
    subcategory: "Cardio"
    tags: ["#workout"]
  - match: "strength|lift|weights"
    category: "Health"
    subcategory: "Strength"
    tags: ["#workout"]
---
```

Notes
- `match` is a regex string (case-insensitive).
- `tags` are optional and will be appended to the parsed tags.
- Frontmatter rules override the default keyword taxonomy.
