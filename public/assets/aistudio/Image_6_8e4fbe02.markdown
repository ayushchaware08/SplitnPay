---
name: SplitnPay
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#ba0035'
  on-secondary: '#ffffff'
  secondary-container: '#e21e49'
  on-secondary-container: '#fffbff'
  tertiary: '#545c72'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c748b'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#ffdada'
  secondary-fixed-dim: '#ffb3b6'
  on-secondary-fixed: '#40000c'
  on-secondary-fixed-variant: '#920028'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  currency-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.03em
  currency-tile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies a modern, high-precision fintech aesthetic tailored for social finance, group travel, and effortless peer-to-peer settlement. It balances financial authority with the social ease of dining and traveling with companions. The interface prioritizes friction-free comprehension: balances, obligations, and settlements must be understood within milliseconds without financial anxiety.

The aesthetic blends **Modern Premium Minimalism** with **Tactile Utility**:
- **Clarity over ornament:** Generous negative space, crisp hair-thin structural borders, and purposeful contrast eliminate cognitive overload.
- **Instant financial comprehension:** Directional color coding clearly delineates credit from debt without alarming the user.
- **Mobile-first ergonomics:** Generous touch targets, floating contextual triggers, dynamic bottom sheets, and thumb-zone navigation optimized for one-handed handheld use on the go.

## Colors
The color system operates on semantic clarity:
- **Primary Emerald (`#059669`, `#10B981`, deep `#064E3B`):** Represents positive balances, repayments received, successful settlements, and core affirmative actions.
- **Secondary Rose (`#E11D48`, `#F43F5E`, soft tint `#FFF1F2`):** Communicates obligations, negative balances, and amounts owed without visual hostility.
- **Tertiary Charcoal (`#0F172A`, slate `#334155`, muted `#64748B`):** Establishes typographic hierarchy, high-contrast headings, and structural anchors.
- **Neutral Canvas (`#FFFFFF`, `#F8FAFC`, subtle divider `#E2E8F0`, surface-tint `#F1F5F9`):** Delivers clean contrast and deliberate grouping across nested card environments.

Use pure white (`#FFFFFF`) for elevated cards and modules floating over the cool slate (`#F8FAFC`) base canvas. Never use un-tinted pure black (`#000000`) for text.

## Typography
Plus Jakarta Sans provides high-legibility geometric construction with subtle warmth, preventing numbers and ledgers from feeling cold or bureaucratic.

### Typographic Rules:
- **Numerical & Financial Data:** All financial amounts, transaction lists, and balance totals must use OpenType tabular figures (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1`) to preserve vertical alignment across ledger columns.
- **Tight Tracking on Metrics:** Primary currency totals (`currency-display`, `currency-tile`) enforce negative letter-spacing (`-0.02em` to `-0.03em`) for visual cohesion.
- **Currency Symbols:** The Indian Rupee symbol (`₹`) is rendered alongside figures without trailing space, sized at `0.85em` relative to the accompanying numeric string.

## Layout & Spacing
The layout follows a responsive grid engineered primarily for mobile single-column viewports, expanding into structured multi-pane dashboards for larger screens.

- **Mobile (<640px):** Single-column fluid layout with an outer canvas margin of `1rem` (16px). All key action elements live in sticky top headers or thumb-accessible bottom sheets and floating action buttons.
- **Tablet (640px - 1024px):** 6-column fluid grid, `2rem` margins, allowing split views between group expense feeds and real-time settle-up graphs.
- **Desktop (>1024px):** 12-column grid capped at a maximum container width of `1200px`, centered with `3rem` margins. The primary column hosts transaction feeds, while the right rail accommodates persistent debt-simplification trees and personal balance ledgers.

## Elevation & Depth
Visual hierarchy relies on layered surfaces and soft, ambient drop shadows rather than heavy border outlines.

- **Base Layer (Level 0):** Canvas `#F8FAFC`. Background for pages, trip hubs, and scroll regions.
- **Card Layer (Level 1):** Solid `#FFFFFF` with a hairline stroke (`1px solid #F1F5F9`) and ambient shadow: `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Raised Interactive Layer (Level 2):** Hover states, summary metric tiles, active toggle containers: `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Floating Modals & Sheets (Level 3):** Bottom sheets, expense creation dialogs, and floating action buttons (FAB): `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`. Accompanied by a 24% dark charcoal backdrop blur (`backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.35)`).

## Shapes
A rounded, pill-forward shape language creates an approachable, modern feel.

- **Chips, Badges, Tabs, and Action Buttons:** Full pill geometry (`rounded-full`, 9999px border-radius).
- **Cards, Containers, and Metric Panels:** Large rounded corners (`rounded-2xl` / 1rem to 1.5rem) provide gentle, tactile grouping.
- **Modals and Mobile Bottom Sheets:** Extra-large top corners (`rounded-t-3xl` / 2rem), reinforcing their physical pull-up card metaphor.

## Components

### 1. Pill Tabs
- Pill-shaped background container styled in `#F1F5F9` with `4px` internal padding.
- Inactive tabs: `#64748B`, transparent background, medium weight.
- Active tab: `#0F172A` text on pure white (`#FFFFFF`) pill with `0 1px 3px rgba(15, 23, 42, 0.08)` shadow and spring sliding animation.

### 2. Balance Badges
- **Positive / You are owed:** Tinted green pill (`#ECFDF5`), bold emerald text (`#059669`), leading with `+₹`.
- **Negative / You owe:** Tinted rose pill (`#FFF1F2`), bold crimson text (`#E11D48`), leading with `-₹`.
- **Settled / Zero balance:** Subtle slate pill (`#F1F5F9`), neutral text (`#64748B`), displaying `₹0.00`.

### 3. Floating Action Button (FAB)
- Prominent pill-shaped or circle-shaped floating button fixed at bottom-right or centered in bottom mobile navigation.
- Deep charcoal (`#0F172A`) or primary emerald (`#059669`) with white high-contrast text/icon, elevated with Level 3 shadow. Triggers quick expense entry.

### 4. Bottom Sheets & Modals
- Slides up from the viewport base on mobile devices.
- Includes a centered drag handle (`36px × 4px`, `#CBD5E1`, rounded full).
- Top corners curved to `2rem` (`rounded-t-3xl`).

### 5. Avatar Stacks
- Overlapping circular member portraits (`-space-x-2` overlap) encased in `2px solid #FFFFFF` halos.
- Trailing indicator `+N` pill for overflow members, colored in `#F1F5F9` with charcoal typography.

### 6. Summary Metric Tiles
- Nested card containers (`rounded-2xl`, background `#FFFFFF`, subtle `1px solid #E2E8F0`).
- Micro-eyebrow label (`label-sm`, uppercase, `#64748B`) followed by prominent tabular figures (`currency-tile`).

### 7. Settle-Up Transaction Graph
- Visual link cards representing who pays whom to minimize total transactions.
- Origin avatar connected by an emerald dotted/solid directional line to destination avatar, with a centered payment chip indicating optimized amount (`₹X,XXX`).

### 8. Input Fields & Selectors
- Background `#FFFFFF` with `1px solid #E2E8F0` border, transitions to `2px solid #059669` ring on focus.
- Dedicated oversized numeric input for expense logging with persistent Indian Rupee currency prefix fixed at headline scale.