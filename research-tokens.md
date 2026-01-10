# Design Tokens Research

## Executive Summary

Design tokens are named entities that store visual design attributes, serving as the single source of truth for design decisions across tools, platforms, and codebases. This research synthesizes best practices from Figma Variables, W3C DTCG specification, Tailwind CSS, Apple HIG, and Material Design 3 to create a comprehensive token architecture.

---

## 1. Industry Standards Overview

### W3C Design Tokens Community Group (DTCG) Specification v1.0

The [first stable version](https://www.designtokens.org/tr/drafts/format/) was released October 2025, establishing:

- **File format**: JSON with `.tokens` or `.tokens.json` extension
- **Media type**: `application/design-tokens+json`
- **Key properties**: `$value`, `$type`, `$description`
- **Alias syntax**: Curly braces `{color.primary}` for token references

### Figma Variables (2025)

[Figma's token system](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma) supports:
- **Number** (scaling, spacing, opacity)
- **Color** (raw and semantic tokens)
- **String** (labels, configuration)
- **Boolean** (logic switches)
- **Alias/Reference** (theme switching)
- **Composite/Array** (shadow, border, animation)

### Material Design 3

[M3 tokens](https://m3.material.io/foundations/design-tokens) use three tiers:
- **Reference tokens** → Raw values (palette)
- **System tokens** → Applied meanings (`md.sys.color.*`)
- **Component tokens** → Specific usage (`md.comp.button.*`)

### Apple Human Interface Guidelines

[Apple's semantic colors](https://developer.apple.com/design/human-interface-guidelines/color) automatically adapt to:
- Light/Dark mode
- Accessibility settings
- Display characteristics
- System accent preferences

---

## 2. Token Architecture

### Three-Tier Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  COMPONENT TOKENS (where)                               │
│  button.background, card.border, input.placeholder      │
├─────────────────────────────────────────────────────────┤
│  SEMANTIC TOKENS (how)                                  │
│  surface.primary, text.muted, border.subtle             │
├─────────────────────────────────────────────────────────┤
│  PRIMITIVE TOKENS (what)                                │
│  gray.900, blue.500, 16px, 400ms                        │
└─────────────────────────────────────────────────────────┘
```

### Naming Convention

Pattern: `[category].[type].[property].[variant].[state]`

Examples:
- `color.text.primary`
- `color.surface.elevated`
- `spacing.component.button.padding-x`
- `radius.interactive.small`

### Responsive Tokens

For size-class aware designs, tokens can adapt:

```json
{
  "spacing.page.margin": {
    "$value": {
      "compact": "16px",
      "regular": "24px",
      "expanded": "32px"
    }
  }
}
```

---

## 3. Color Tokens

### Primitive Colors (Raw Palette)

```json
{
  "color": {
    "gray": {
      "50":  { "$value": "#fafafa" },
      "100": { "$value": "#f5f5f5" },
      "200": { "$value": "#e5e5e5" },
      "300": { "$value": "#d4d4d4" },
      "400": { "$value": "#a3a3a3" },
      "500": { "$value": "#737373" },
      "600": { "$value": "#525252" },
      "700": { "$value": "#404040" },
      "800": { "$value": "#262626" },
      "900": { "$value": "#171717" },
      "950": { "$value": "#0a0a0a" }
    },
    "blue": {
      "50":  { "$value": "#eff6ff" },
      "100": { "$value": "#dbeafe" },
      "200": { "$value": "#bfdbfe" },
      "300": { "$value": "#93c5fd" },
      "400": { "$value": "#60a5fa" },
      "500": { "$value": "#3b82f6" },
      "600": { "$value": "#2563eb" },
      "700": { "$value": "#1d4ed8" },
      "800": { "$value": "#1e40af" },
      "900": { "$value": "#1e3a8a" }
    },
    "green": {
      "500": { "$value": "#22c55e" },
      "600": { "$value": "#16a34a" },
      "700": { "$value": "#15803d" }
    },
    "red": {
      "500": { "$value": "#ef4444" },
      "600": { "$value": "#dc2626" },
      "700": { "$value": "#b91c1c" }
    },
    "amber": {
      "500": { "$value": "#f59e0b" },
      "600": { "$value": "#d97706" }
    }
  }
}
```

### Semantic Colors (Purpose-Based)

```json
{
  "color": {
    "background": {
      "primary":   { "$value": "{color.gray.50}" },
      "secondary": { "$value": "{color.gray.100}" },
      "tertiary":  { "$value": "{color.gray.200}" },
      "inverse":   { "$value": "{color.gray.900}" }
    },
    "surface": {
      "default":   { "$value": "{color.white}" },
      "raised":    { "$value": "{color.white}" },
      "overlay":   { "$value": "{color.gray.50}" },
      "sunken":    { "$value": "{color.gray.100}" }
    },
    "text": {
      "primary":   { "$value": "{color.gray.900}" },
      "secondary": { "$value": "{color.gray.600}" },
      "tertiary":  { "$value": "{color.gray.500}" },
      "disabled":  { "$value": "{color.gray.400}" },
      "inverse":   { "$value": "{color.white}" },
      "link":      { "$value": "{color.blue.600}" }
    },
    "border": {
      "default":   { "$value": "{color.gray.200}" },
      "subtle":    { "$value": "{color.gray.100}" },
      "strong":    { "$value": "{color.gray.300}" },
      "focus":     { "$value": "{color.blue.500}" }
    },
    "accent": {
      "primary":   { "$value": "{color.blue.600}" },
      "secondary": { "$value": "{color.blue.100}" },
      "text":      { "$value": "{color.blue.700}" }
    },
    "status": {
      "success":   { "$value": "{color.green.600}" },
      "success-subtle": { "$value": "{color.green.50}" },
      "warning":   { "$value": "{color.amber.600}" },
      "warning-subtle": { "$value": "{color.amber.50}" },
      "error":     { "$value": "{color.red.600}" },
      "error-subtle": { "$value": "{color.red.50}" },
      "info":      { "$value": "{color.blue.600}" },
      "info-subtle": { "$value": "{color.blue.50}" }
    }
  }
}
```

### Component Colors (Specific Usage)

```json
{
  "color": {
    "button": {
      "primary": {
        "background": { "$value": "{color.accent.primary}" },
        "text":       { "$value": "{color.text.inverse}" },
        "border":     { "$value": "transparent" }
      },
      "secondary": {
        "background": { "$value": "transparent" },
        "text":       { "$value": "{color.accent.primary}" },
        "border":     { "$value": "{color.accent.primary}" }
      }
    },
    "input": {
      "background":  { "$value": "{color.surface.default}" },
      "border":      { "$value": "{color.border.default}" },
      "placeholder": { "$value": "{color.text.tertiary}" },
      "focus-ring":  { "$value": "{color.border.focus}" }
    },
    "card": {
      "background": { "$value": "{color.surface.raised}" },
      "border":     { "$value": "{color.border.subtle}" }
    }
  }
}
```

### Dark Mode Mapping

```json
{
  "color": {
    "background": {
      "primary":   { "$value": "{color.gray.950}" },
      "secondary": { "$value": "{color.gray.900}" },
      "tertiary":  { "$value": "{color.gray.800}" }
    },
    "surface": {
      "default":   { "$value": "{color.gray.900}" },
      "raised":    { "$value": "{color.gray.800}" },
      "overlay":   { "$value": "{color.gray.800}" }
    },
    "text": {
      "primary":   { "$value": "{color.gray.50}" },
      "secondary": { "$value": "{color.gray.400}" },
      "tertiary":  { "$value": "{color.gray.500}" }
    },
    "border": {
      "default":   { "$value": "{color.gray.700}" },
      "subtle":    { "$value": "{color.gray.800}" }
    }
  }
}
```

---

## 4. Typography Tokens

### Primitive Typography

```json
{
  "font": {
    "family": {
      "sans":  { "$value": "SF Pro, -apple-system, BlinkMacSystemFont, sans-serif" },
      "mono":  { "$value": "SF Mono, Menlo, Monaco, monospace" },
      "serif": { "$value": "New York, Georgia, serif" }
    },
    "weight": {
      "regular":  { "$value": 400 },
      "medium":   { "$value": 500 },
      "semibold": { "$value": 600 },
      "bold":     { "$value": 700 }
    },
    "size": {
      "xs":   { "$value": "11px" },
      "sm":   { "$value": "13px" },
      "base": { "$value": "15px" },
      "md":   { "$value": "17px" },
      "lg":   { "$value": "20px" },
      "xl":   { "$value": "24px" },
      "2xl":  { "$value": "28px" },
      "3xl":  { "$value": "34px" },
      "4xl":  { "$value": "40px" }
    },
    "lineHeight": {
      "tight":   { "$value": 1.2 },
      "snug":    { "$value": 1.35 },
      "normal":  { "$value": 1.5 },
      "relaxed": { "$value": 1.65 }
    },
    "tracking": {
      "tighter": { "$value": "-0.02em" },
      "tight":   { "$value": "-0.01em" },
      "normal":  { "$value": "0" },
      "wide":    { "$value": "0.01em" },
      "wider":   { "$value": "0.02em" }
    }
  }
}
```

### Semantic Typography (Type Scale)

Following Material Design 3's type scale pattern:

```json
{
  "typography": {
    "display": {
      "large": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.4xl}",
          "fontWeight": "{font.weight.regular}",
          "lineHeight": "{font.lineHeight.tight}",
          "letterSpacing": "{font.tracking.tighter}"
        }
      },
      "medium": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.3xl}",
          "fontWeight": "{font.weight.regular}",
          "lineHeight": "{font.lineHeight.tight}",
          "letterSpacing": "{font.tracking.tight}"
        }
      },
      "small": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.2xl}",
          "fontWeight": "{font.weight.regular}",
          "lineHeight": "{font.lineHeight.snug}",
          "letterSpacing": "{font.tracking.normal}"
        }
      }
    },
    "headline": {
      "large": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.xl}",
          "fontWeight": "{font.weight.semibold}",
          "lineHeight": "{font.lineHeight.snug}",
          "letterSpacing": "{font.tracking.normal}"
        }
      },
      "medium": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.lg}",
          "fontWeight": "{font.weight.semibold}",
          "lineHeight": "{font.lineHeight.snug}",
          "letterSpacing": "{font.tracking.normal}"
        }
      },
      "small": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.md}",
          "fontWeight": "{font.weight.semibold}",
          "lineHeight": "{font.lineHeight.normal}",
          "letterSpacing": "{font.tracking.normal}"
        }
      }
    },
    "title": {
      "large": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.md}",
          "fontWeight": "{font.weight.medium}",
          "lineHeight": "{font.lineHeight.normal}",
          "letterSpacing": "{font.tracking.normal}"
        }
      },
      "medium": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.base}",
          "fontWeight": "{font.weight.medium}",
          "lineHeight": "{font.lineHeight.normal}",
          "letterSpacing": "{font.tracking.normal}"
        }
      },
      "small": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.sm}",
          "fontWeight": "{font.weight.medium}",
          "lineHeight": "{font.lineHeight.normal}",
          "letterSpacing": "{font.tracking.wide}"
        }
      }
    },
    "body": {
      "large": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.md}",
          "fontWeight": "{font.weight.regular}",
          "lineHeight": "{font.lineHeight.relaxed}",
          "letterSpacing": "{font.tracking.normal}"
        }
      },
      "medium": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.base}",
          "fontWeight": "{font.weight.regular}",
          "lineHeight": "{font.lineHeight.normal}",
          "letterSpacing": "{font.tracking.normal}"
        }
      },
      "small": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.sm}",
          "fontWeight": "{font.weight.regular}",
          "lineHeight": "{font.lineHeight.normal}",
          "letterSpacing": "{font.tracking.normal}"
        }
      }
    },
    "label": {
      "large": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.base}",
          "fontWeight": "{font.weight.medium}",
          "lineHeight": "{font.lineHeight.tight}",
          "letterSpacing": "{font.tracking.wide}"
        }
      },
      "medium": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.sm}",
          "fontWeight": "{font.weight.medium}",
          "lineHeight": "{font.lineHeight.tight}",
          "letterSpacing": "{font.tracking.wide}"
        }
      },
      "small": {
        "$value": {
          "fontFamily": "{font.family.sans}",
          "fontSize": "{font.size.xs}",
          "fontWeight": "{font.weight.medium}",
          "lineHeight": "{font.lineHeight.tight}",
          "letterSpacing": "{font.tracking.wider}"
        }
      }
    }
  }
}
```

---

## 5. Spacing Tokens

### Primitive Spacing (4px Base Unit)

```json
{
  "spacing": {
    "0":   { "$value": "0" },
    "px":  { "$value": "1px" },
    "0.5": { "$value": "2px" },
    "1":   { "$value": "4px" },
    "1.5": { "$value": "6px" },
    "2":   { "$value": "8px" },
    "2.5": { "$value": "10px" },
    "3":   { "$value": "12px" },
    "3.5": { "$value": "14px" },
    "4":   { "$value": "16px" },
    "5":   { "$value": "20px" },
    "6":   { "$value": "24px" },
    "7":   { "$value": "28px" },
    "8":   { "$value": "32px" },
    "9":   { "$value": "36px" },
    "10":  { "$value": "40px" },
    "12":  { "$value": "48px" },
    "14":  { "$value": "56px" },
    "16":  { "$value": "64px" },
    "20":  { "$value": "80px" },
    "24":  { "$value": "96px" }
  }
}
```

### Semantic Spacing

```json
{
  "spacing": {
    "page": {
      "margin": {
        "compact":  { "$value": "{spacing.4}" },
        "regular":  { "$value": "{spacing.6}" },
        "expanded": { "$value": "{spacing.8}" }
      },
      "gutter": { "$value": "{spacing.6}" }
    },
    "section": {
      "gap": { "$value": "{spacing.12}" }
    },
    "stack": {
      "xs":  { "$value": "{spacing.1}" },
      "sm":  { "$value": "{spacing.2}" },
      "md":  { "$value": "{spacing.4}" },
      "lg":  { "$value": "{spacing.6}" },
      "xl":  { "$value": "{spacing.8}" }
    },
    "inline": {
      "xs":  { "$value": "{spacing.1}" },
      "sm":  { "$value": "{spacing.2}" },
      "md":  { "$value": "{spacing.3}" },
      "lg":  { "$value": "{spacing.4}" }
    }
  }
}
```

### Component Spacing

```json
{
  "spacing": {
    "button": {
      "padding-x": {
        "sm": { "$value": "{spacing.3}" },
        "md": { "$value": "{spacing.4}" },
        "lg": { "$value": "{spacing.6}" }
      },
      "padding-y": {
        "sm": { "$value": "{spacing.1.5}" },
        "md": { "$value": "{spacing.2}" },
        "lg": { "$value": "{spacing.3}" }
      },
      "gap": { "$value": "{spacing.2}" }
    },
    "input": {
      "padding-x": { "$value": "{spacing.3}" },
      "padding-y": { "$value": "{spacing.2}" }
    },
    "card": {
      "padding": { "$value": "{spacing.4}" },
      "gap":     { "$value": "{spacing.3}" }
    }
  }
}
```

---

## 6. Radius Tokens

### Primitive Radius

```json
{
  "radius": {
    "none":  { "$value": "0" },
    "xs":    { "$value": "2px" },
    "sm":    { "$value": "4px" },
    "md":    { "$value": "6px" },
    "lg":    { "$value": "8px" },
    "xl":    { "$value": "12px" },
    "2xl":   { "$value": "16px" },
    "3xl":   { "$value": "24px" },
    "full":  { "$value": "9999px" }
  }
}
```

### Semantic Radius

```json
{
  "radius": {
    "interactive": {
      "sm": { "$value": "{radius.sm}" },
      "md": { "$value": "{radius.md}" },
      "lg": { "$value": "{radius.lg}" }
    },
    "container": {
      "sm": { "$value": "{radius.lg}" },
      "md": { "$value": "{radius.xl}" },
      "lg": { "$value": "{radius.2xl}" }
    },
    "pill": { "$value": "{radius.full}" }
  }
}
```

### Component Radius

```json
{
  "radius": {
    "button":  { "$value": "{radius.interactive.md}" },
    "input":   { "$value": "{radius.interactive.md}" },
    "card":    { "$value": "{radius.container.md}" },
    "modal":   { "$value": "{radius.container.lg}" },
    "badge":   { "$value": "{radius.pill}" },
    "avatar":  { "$value": "{radius.full}" }
  }
}
```

---

## 7. Shadow (Elevation) Tokens

### Primitive Shadows

Based on [Material Design](https://m3.material.io/styles/elevation/applying-elevation) and [Atlassian](https://atlassian.design/foundations/elevation/) patterns:

```json
{
  "shadow": {
    "xs": {
      "$value": "0 1px 2px 0 rgb(0 0 0 / 0.05)"
    },
    "sm": {
      "$value": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
    },
    "md": {
      "$value": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
    },
    "lg": {
      "$value": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
    },
    "xl": {
      "$value": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
    },
    "2xl": {
      "$value": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
    },
    "inner": {
      "$value": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)"
    }
  }
}
```

### Semantic Elevation

```json
{
  "elevation": {
    "level-0": { "$value": "none" },
    "level-1": { "$value": "{shadow.xs}" },
    "level-2": { "$value": "{shadow.sm}" },
    "level-3": { "$value": "{shadow.md}" },
    "level-4": { "$value": "{shadow.lg}" },
    "level-5": { "$value": "{shadow.xl}" }
  }
}
```

### Component Elevation

```json
{
  "elevation": {
    "card":     { "$value": "{elevation.level-1}" },
    "raised":   { "$value": "{elevation.level-2}" },
    "dropdown": { "$value": "{elevation.level-3}" },
    "modal":    { "$value": "{elevation.level-4}" },
    "toast":    { "$value": "{elevation.level-3}" },
    "popover":  { "$value": "{elevation.level-3}" }
  }
}
```

---

## 8. Duration Tokens

### Primitive Duration

Based on [Material Design 3 motion tokens](https://github.com/material-foundation/material-tokens):

```json
{
  "duration": {
    "instant":    { "$value": "0ms" },
    "short-1":    { "$value": "50ms" },
    "short-2":    { "$value": "100ms" },
    "short-3":    { "$value": "150ms" },
    "short-4":    { "$value": "200ms" },
    "medium-1":   { "$value": "250ms" },
    "medium-2":   { "$value": "300ms" },
    "medium-3":   { "$value": "350ms" },
    "medium-4":   { "$value": "400ms" },
    "long-1":     { "$value": "450ms" },
    "long-2":     { "$value": "500ms" },
    "long-3":     { "$value": "550ms" },
    "long-4":     { "$value": "600ms" },
    "extra-long-1": { "$value": "700ms" },
    "extra-long-2": { "$value": "800ms" },
    "extra-long-3": { "$value": "900ms" },
    "extra-long-4": { "$value": "1000ms" }
  }
}
```

### Semantic Duration

```json
{
  "duration": {
    "instant":  { "$value": "{duration.instant}" },
    "fast":     { "$value": "{duration.short-2}" },
    "normal":   { "$value": "{duration.short-4}" },
    "slow":     { "$value": "{duration.medium-2}" },
    "slower":   { "$value": "{duration.medium-4}" }
  }
}
```

### Component Duration

```json
{
  "duration": {
    "button": { "$value": "{duration.fast}" },
    "fade":   { "$value": "{duration.normal}" },
    "slide":  { "$value": "{duration.slow}" },
    "modal": {
      "enter": { "$value": "{duration.slow}" },
      "exit":  { "$value": "{duration.normal}" }
    },
    "tooltip": {
      "enter": { "$value": "{duration.normal}" },
      "exit":  { "$value": "{duration.fast}" }
    }
  }
}
```

---

## 9. Easing Tokens

### Primitive Easing (Cubic Bezier)

Based on [Material Design 3 motion system](https://m3.material.io/styles/motion/easing-and-duration):

```json
{
  "easing": {
    "linear": {
      "$value": "cubic-bezier(0, 0, 1, 1)"
    },
    "standard": {
      "$value": "cubic-bezier(0.2, 0, 0, 1)"
    },
    "standard-accelerate": {
      "$value": "cubic-bezier(0.3, 0, 1, 1)"
    },
    "standard-decelerate": {
      "$value": "cubic-bezier(0, 0, 0, 1)"
    },
    "emphasized": {
      "$value": "cubic-bezier(0.2, 0, 0, 1)"
    },
    "emphasized-accelerate": {
      "$value": "cubic-bezier(0.3, 0, 0.8, 0.15)"
    },
    "emphasized-decelerate": {
      "$value": "cubic-bezier(0.05, 0.7, 0.1, 1)"
    },
    "legacy": {
      "$value": "cubic-bezier(0.4, 0, 0.2, 1)"
    },
    "legacy-accelerate": {
      "$value": "cubic-bezier(0.4, 0, 1, 1)"
    },
    "legacy-decelerate": {
      "$value": "cubic-bezier(0, 0, 0.2, 1)"
    }
  }
}
```

### Semantic Easing

```json
{
  "easing": {
    "default":    { "$value": "{easing.standard}" },
    "enter":      { "$value": "{easing.emphasized-decelerate}" },
    "exit":       { "$value": "{easing.emphasized-accelerate}" },
    "move":       { "$value": "{easing.emphasized}" },
    "spring": {
      "$value": "cubic-bezier(0.34, 1.56, 0.64, 1)"
    }
  }
}
```

### Component Easing

```json
{
  "easing": {
    "button":   { "$value": "{easing.default}" },
    "modal": {
      "enter":  { "$value": "{easing.enter}" },
      "exit":   { "$value": "{easing.exit}" }
    },
    "slide": {
      "in":     { "$value": "{easing.enter}" },
      "out":    { "$value": "{easing.exit}" }
    },
    "bounce":   { "$value": "{easing.spring}" }
  }
}
```

---

## 10. State Layer Tokens

For interaction feedback (from [MDUI](https://www.mdui.org/en/docs/2/styles/design-tokens)):

```json
{
  "state": {
    "hover": {
      "opacity": { "$value": 0.08 }
    },
    "focus": {
      "opacity": { "$value": 0.12 }
    },
    "pressed": {
      "opacity": { "$value": 0.12 }
    },
    "dragged": {
      "opacity": { "$value": 0.16 }
    },
    "disabled": {
      "opacity": { "$value": 0.38 }
    }
  }
}
```

---

## 11. Responsive Breakpoints

```json
{
  "breakpoint": {
    "xs":  { "$value": "0px" },
    "sm":  { "$value": "600px" },
    "md":  { "$value": "840px" },
    "lg":  { "$value": "1080px" },
    "xl":  { "$value": "1440px" },
    "2xl": { "$value": "1920px" }
  }
}
```

### Size Class Mapping (iOS-style)

```json
{
  "sizeClass": {
    "compact": {
      "minWidth": { "$value": "{breakpoint.xs}" },
      "maxWidth": { "$value": "{breakpoint.sm}" }
    },
    "regular": {
      "minWidth": { "$value": "{breakpoint.sm}" },
      "maxWidth": { "$value": "{breakpoint.lg}" }
    },
    "expanded": {
      "minWidth": { "$value": "{breakpoint.lg}" }
    }
  }
}
```

---

## 12. CSS Custom Properties Output

Example CSS output using [Style Dictionary](https://styledictionary.com/):

```css
:root {
  /* Color Primitives */
  --color-gray-50: #fafafa;
  --color-gray-900: #171717;
  --color-blue-600: #2563eb;

  /* Color Semantic */
  --color-background-primary: var(--color-gray-50);
  --color-text-primary: var(--color-gray-900);
  --color-accent-primary: var(--color-blue-600);

  /* Typography */
  --font-family-sans: SF Pro, -apple-system, sans-serif;
  --font-size-base: 15px;
  --font-weight-medium: 500;

  /* Spacing */
  --spacing-4: 16px;
  --spacing-6: 24px;

  /* Radius */
  --radius-md: 6px;
  --radius-button: var(--radius-md);

  /* Shadow */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --elevation-card: var(--shadow-sm);

  /* Motion */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --easing-default: cubic-bezier(0.2, 0, 0, 1);
  --easing-enter: cubic-bezier(0.05, 0.7, 0.1, 1);
}

/* Dark mode overrides */
[data-theme="dark"] {
  --color-background-primary: var(--color-gray-950);
  --color-text-primary: var(--color-gray-50);
}

/* Size class responsive tokens */
@media (min-width: 600px) {
  :root {
    --spacing-page-margin: var(--spacing-6);
  }
}

@media (min-width: 1080px) {
  :root {
    --spacing-page-margin: var(--spacing-8);
  }
}
```

---

## 13. Swift/SwiftUI Output

```swift
import SwiftUI

enum DesignTokens {
    // MARK: - Colors
    enum Color {
        static let backgroundPrimary = SwiftUI.Color("backgroundPrimary")
        static let textPrimary = SwiftUI.Color("textPrimary")
        static let accentPrimary = SwiftUI.Color("accentPrimary")
    }

    // MARK: - Typography
    enum Typography {
        static let displayLarge = Font.system(size: 40, weight: .regular)
        static let headlineMedium = Font.system(size: 20, weight: .semibold)
        static let bodyMedium = Font.system(size: 15, weight: .regular)
        static let labelSmall = Font.system(size: 11, weight: .medium)
    }

    // MARK: - Spacing
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }

    // MARK: - Radius
    enum Radius {
        static let sm: CGFloat = 4
        static let md: CGFloat = 6
        static let lg: CGFloat = 8
        static let full: CGFloat = 9999
    }

    // MARK: - Duration
    enum Duration {
        static let fast: Double = 0.1
        static let normal: Double = 0.2
        static let slow: Double = 0.3
    }

    // MARK: - Easing
    enum Easing {
        static let standard = Animation.timingCurve(0.2, 0, 0, 1)
        static let enter = Animation.timingCurve(0.05, 0.7, 0.1, 1)
        static let exit = Animation.timingCurve(0.3, 0, 0.8, 0.15)
    }
}
```

---

## 14. File Organization

Recommended token file structure:

```
tokens/
├── primitives/
│   ├── colors.tokens.json
│   ├── typography.tokens.json
│   ├── spacing.tokens.json
│   ├── radius.tokens.json
│   ├── shadows.tokens.json
│   └── motion.tokens.json
├── semantic/
│   ├── colors.tokens.json
│   ├── typography.tokens.json
│   ├── spacing.tokens.json
│   ├── elevation.tokens.json
│   └── motion.tokens.json
├── components/
│   ├── button.tokens.json
│   ├── input.tokens.json
│   ├── card.tokens.json
│   └── modal.tokens.json
└── themes/
    ├── light.tokens.json
    └── dark.tokens.json
```

---

## Sources

- [W3C Design Tokens Specification 2025.10](https://www.designtokens.org/tr/drafts/format/)
- [Figma Variables Guide](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Material Design 3 Design Tokens](https://m3.material.io/foundations/design-tokens)
- [Material Tokens GitHub (Motion JSON)](https://github.com/material-foundation/material-tokens)
- [Apple Human Interface Guidelines - Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Style Dictionary Documentation](https://styledictionary.com/)
- [Tailwind CSS Color Tokens](https://github.com/epicweb-dev/tailwindcss-color-tokens)
- [MDUI Design Tokens](https://www.mdui.org/en/docs/2/styles/design-tokens)
- [Atlassian Elevation](https://atlassian.design/foundations/elevation/)
- [Fluent 2 Elevation](https://fluent2.microsoft.design/elevation)
