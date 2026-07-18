---
name: SEO Content Control Center (Marketing)
description: The Swiss Grid Ledger visual identity for SEO operations
colors:
  primary: "#050505"
  neutral-bg: "#fbfbfa"
  surface: "#ffffff"
  surface-soft: "#f7f6f3"
  surface-warm: "#f9f9f8"
  ink: "#111111"
  ink-soft: "#6b6963"
  line: "#eaeaea"
  line-strong: "rgba(0, 0, 0, 0.1)"
  danger: "#111111"
  success: "#111111"
typography:
  display:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(3.1rem, 5.4vw, 5rem)"
    fontWeight: 680
    lineHeight: 0.95
    letterSpacing: "0"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    fontWeight: 560
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0px 20px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "#333333"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0px 20px"
    height: "46px"
  button-secondary-hover:
    backgroundColor: "#f5f5f5"
---

# Design System: SEO Content Control Center (Marketing)

## 1. Overview

**Creative North Star: "The Swiss Grid Ledger"**

A stark, high-precision layout engine resembling a professional operating console or a financial ledger. It rejects decorative fluff, generic AI gradients, and round bubbles, focusing instead on strict layout grids, structured lists, typographic hierarchies, and explicit human-approval indicators.

**Key Characteristics:**

- Strict alignment to a clean typographic grid.
- Boundaries defined by crisp 1px borders rather than shadows or depth effects.
- Solid background fills using structured light grays and rich ink.
- Functional typography emphasizing readability and content priority.

## 2. Colors

A high-contrast neutral-forward palette designed for long reading sessions and precise information presentation.

### Primary

- **Ink** (#050505): Primary branding shade, display type, and high-contrast button actions.

### Neutral

- **Page Background** (#fafafa): Soft, low-strain canvas background.
- **Surface Fills** (#ffffff): Background containers for panels, input groups, and headers.
- **Line Borders** (#eaeaea): Structural separator line.
- **Strong Borders** (#d4d4d4): Interactive and active borders.

### Named Rules

**The No-Gradients Rule.** Gradients are strictly forbidden. All panels, backgrounds, and display titles must use solid, clean colors.
**The Border-as-Structure Rule.** Depth is created solely through 1px border lines, not box shadows.

## 3. Typography

**Display Font:** Geist (Next font)
**Body Font:** Geist (Next font)
**Label Font:** Geist (Next font)

### Hierarchy

- **Display** (weight 680, size `clamp(3.1rem, 5.4vw, 5rem)`, line-height 0.95): Hero and page headlines.
- **Headline** (weight 680, fluid size, line-height 0.95-1.1): Major section titles.
- **Title** (weight 560, size 18px, line-height 1.35): Panel headers, block kickers.
- **Body** (weight 400, size 16px, line-height 1.5): Standard paragraphs (max line length 65–75ch).
- **Label** (weight 560-650, size 11-14px, line-height 1.2-1.4): Button text, form inputs, badges, and section labels.

### Named Rules

**The Balanced Line Rule.** Headings must use `text-wrap: balance` to prevent awkward line breaks and layout orphans.
**The Quiet Label Rule.** Section labels use sentence case with zero letter spacing. Do not repeat tiny uppercase kickers as section grammar.

## 4. Elevation

The system is Flat-by-Default. Layers are indicated by clean 1px border outlines and background shading transitions.

### Named Rules

**The Flat-by-Default Rule.** Do not use drop shadows to represent card elevation. Separations are created via borders (`#eaeaea`) and container background fills (`#ffffff`).

## 5. Components

### Buttons

- **Shape:** Slightly rounded corners (6px).
- **Primary:** Background color of `#050505` and text color of `#ffffff`. Padding is 20px horizontally and height is 46px.
- **Secondary:** Background color is transparent, text color is `#050505`, border is 1px solid `#d4d4d4`.

### Cards / Containers

- **Corner Style:** Slightly rounded corners (6px for controls, 8px for framed panels).
- **Background:** Solid `#ffffff`.
- **Border:** 1px solid `#eaeaea`.
- **Shadow Strategy:** No shadow. Card boundary is purely border-based.

### Inputs / Fields

- **Style:** Background `#ffffff`, border 1px solid `#d4d4d4`, corner radius 6px.
- **Focus:** Outline 2px solid `#000000` with 3px offset.

### Navigation

- **Style:** High-contrast links, font weight 500, size 14px. Hover uses `#666666`. Mobile navigation opens via full-width slide-out list panel.

## 6. Do's and Don'ts

### Do:

- **Do** align columns, blocks, and forms strictly to the grid structure.
- **Do** ensure all text hits a minimum of 4.5:1 contrast ratio against its background.
- **Do** support prefers-reduced-motion to swap transitions for instant state changes.

### Don't:

- **Don't** use purple/blue gradients or blurry neon glow spheres.
- **Don't** use tiny uppercase kickers above every section.
- **Don't** use sketchy hand-drawn SVGs or doodles.
- **Don't** pair rounded borders of 32px or more. Maximum framed-container radius is 8px; pill radius is reserved for badges and compact controls.
