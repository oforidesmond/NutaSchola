# Excellence Kids Design Language & UI Philosophy
## Apple-Grade Design System — NutaSchola Product Line

---

## 🎯 Purpose

This document defines the **complete design language, visual philosophy, and interaction standards** for the Excellence Kids school management system, built by NutaSolutions under the internal codebase name **NutaSchola**.

**Naming note:** `NutaSchola` is the product/codebase name inside the NutaSolutions umbrella. Everywhere the user sees the product — in-app, on marketing pages, in emails, in production — it is branded **"Excellence Kids"** after the school it currently serves. Keep brand strings (name, logo, tagline, colors) in a small number of config points rather than hardcoded across the app; this build is single-tenant by design for now, but that discipline is what makes a future customizable multi-tenant brand layer a config change instead of a rewrite.

This document is a **sibling** to the main NutaSolutions Design Language, not a replacement. The Apple-grade philosophy, spacing grid, shadow system, radius scale, and accessibility standards are intentionally the same discipline you already use — only the color system, brand voice, and a handful of education-specific patterns change to suit a school used daily by teachers, front-desk staff, school leadership, and parents of very young children (creche through JHS).

**Target Surfaces:**
- Excellence Kids Admin/Staff Web App (Next.js) — admissions, students, fees, attendance, academics, communications
- Excellence Kids Parent-facing views (starts read-only, grows into a portal)
- Any future NutaSchola marketing/onboarding pages

**Goal:** An interface that feels as trustworthy and unfussy as Apple's own software, while being warm enough that a parent dropping off a 4-year-old for the first time feels reassured, not processed by a system.

---

## 🧠 Core Design Philosophy

### 1. The Same Three Apple Principles — Reapplied for a School

#### Clarity
A front-desk officer processing twenty admissions during enrollment season, and a parent checking their child's status from a phone in a taxi, both need to understand the screen in under two seconds.
- One primary action per screen; everything else recedes.
- Status is always communicated by both color **and** text/label — never color alone (this matters even more here: some staff and parents may have color vision deficiencies, and status color-coding is central to this product — see the Semantic Status System below).
- Minimum 16px body text; form labels never smaller than 15px, since forms will be read by staff of all ages and comfort levels with software.

#### Deference
The content is a child's record, a fee balance, an attendance mark — not the chrome around it. The interface should feel like a calm, well-organized filing system, not a dashboard showing off.
- Glass and blur are used the same way as the parent Apple-grade system — navigation and toolbars, never content.
- No decorative illustration inside working screens (lists, forms, tables). Illustration is reserved for empty states and the parent-facing experience only, and even there, restrained.

#### Depth
Same 5-layer system as the base NutaSolutions language (background → toolbar/sidebar glass → content → floating cards → modals). No changes here — reuse it verbatim.

---

### 2. Trust Through Design, for a School Context

**The interface must communicate, in order of priority:**
1. **Care** — this is about children; nothing in the UI should feel cold or purely transactional, especially in parent-facing views.
2. **Reliability** — an admissions officer or accountant is relying on this system during real, sometimes stressful, in-person moments (a parent standing at the desk).
3. **Professionalism** — school leadership and inspectors need to trust this looks and behaves like serious record-keeping software, not a hobby project.

**Avoid:**
- Cartoon mascots, bouncing characters, or nursery-style illustration in the working (staff) product — save warmth for color, language, and the logo itself, not cartoon decoration.
- Anything that makes fee balances, admission decisions, or attendance records feel unserious.
- Overcorrecting into cold enterprise sterility either — a *little* more color presence than a typical B2B SaaS is correct here, because the brand identity (four dancing children) earns it.

### 3. Design for Clarity, Not Creativity
Unchanged from the base philosophy: creativity shows up in precision, polish, and systematic thinking — not in loud color or novel layouts.

---

## 🎨 Visual System

### 1. Color Philosophy

Excellence Kids' logo already contains a built-in semantic color story: four children, four colors, one school. That mapping is not a coincidence to preserve — it's the foundation of this system's semantic (status) colors, extracted directly from the school's actual logo artwork rather than invented separately.

| Logo element | Extracted color | Role in the UI |
|---|---|---|
| Arc & wordmark (blue) | `#0C6C9C` | **Brand primary** — the one accent color, used the way NutaSolutions blue is used in the base system |
| Green child | `#009C48` | Success / positive states (admitted, paid, present) |
| Red child + tagline | `#E41824` | Error / critical states (rejected, overdue, absent) |
| Orange child | `#F08418` | Warning / attention states (waitlisted, pending, partial payment) |
| Stars | `#86868B` | Neutral gray — this happens to sit almost exactly on Apple's own system gray, which is a lucky, welcome coincidence |

This is a stronger, more legitimate reason to use these four colors as your semantic palette than picking them arbitrarily — they *are* the brand.

#### Base Neutrals (unchanged from NutaSolutions base system)

```css
--white: #FFFFFF;
--gray-50:  #F9FAFB;  /* subtle backgrounds */
--gray-100: #F3F4F6;  /* card backgrounds */
--gray-200: #E5E7EB;  /* borders, dividers */
--gray-300: #D1D5DB;  /* disabled states */
--gray-400: #9CA3AF;  /* placeholder text */
--gray-500: #6B7280;  /* secondary text */
--gray-600: #4B5563;  /* body text (light mode) */
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;  /* headings, emphasis */
--black: #000000;
```

#### Brand Accent — Excellence Blue

The single accent color for primary buttons, links, active states, and focus rings — used exactly as sparingly as the base system's blue.

```css
--brand-50:  #F1FAFE;
--brand-100: #BDE6FB;
--brand-200: #8AD3F8;
--brand-300: #56C0F5;
--brand-400: #23ADF2;
--brand-500: #0D90D2;
--brand-600: #0C6C9C;  /* PRIMARY — from the logo arc & wordmark */
--brand-700: #09557B;  /* hover state */
--brand-800: #073E5A;  /* active/pressed state */
--brand-900: #042739;
```

#### Semantic / System Colors

```css
/* Success — from the green child */
--success-50:  #F0FFF7;
--success-500: #00D462;
--success-600: #009C48;  /* base */
--success-700: #007B39;

/* Error — from the red child + tagline */
--error-50:  #FEF1F2;
--error-500: #EE3742;
--error-600: #E41824;  /* base */
--error-700: #B1131C;

/* Warning — from the orange child */
--warning-50:  #FEF7F0;
--warning-500: #F59739;
--warning-600: #F08418;  /* base */
--warning-700: #C0660C;

/* Info — reuses brand blue; do not introduce a 5th color */
--info-600: #0C6C9C;
```

#### Dark Mode Palette

Identical structure to the base NutaSolutions dark system — reuse it as-is, only swapping the accent:

```css
--dm-bg-primary: #000000;
--dm-bg-secondary: #1C1C1E;
--dm-bg-tertiary: #2C2C2E;
--dm-bg-quaternary: #3A3A3C;

--dm-text-primary: #FFFFFF;
--dm-text-secondary: rgba(255,255,255,0.6);
--dm-text-tertiary: rgba(255,255,255,0.4);

--dm-border: rgba(255,255,255,0.1);
--dm-divider: rgba(255,255,255,0.05);

--dm-brand: #38B3F0;   /* brand-400, lifted for dark-mode contrast */
--dm-success: #46FF9C; /* success-300 */
--dm-error: #F48188;   /* error-300 */
--dm-warning: #F9BE82; /* warning-300 */
```

Dark mode uses the **lighter tint** (300/400 step) of each semantic color rather than the raw brand color — the raw 600-step colors are tuned for contrast against white, not black.

#### Color Usage Rules

1. **60-30-10, unchanged:** 60% neutral, 30% supporting/subtle backgrounds, 10% color (brand + semantic combined).
2. **One brand accent only** (`brand-600`). Green/red/orange are reserved for *status meaning*, never decoration — if you catch yourself reaching for success-green to make a button "feel nice," stop; that's a status color being misused.
3. **Contrast:** same AAA target as the base system — body text minimum 7:1, UI elements minimum 4.5:1. Note that `warning-600` (`#F08418`) on white is roughly 2.6:1 — **never** use it as text-on-white; use it as a filled badge background with white text, or as an icon accent at larger sizes only.
4. **Never:** neon saturation beyond what's specified above, multiple accent colors competing on one screen, gradients as primary backgrounds.

#### Semantic Status System (ties directly into the admissions/fees schema)

This is the concrete translation of "four colors, four meanings" into product states — use these exact mappings everywhere a status appears, so a user learns the system once and it holds everywhere:

| Meaning | Color token | Example states |
|---|---|---|
| Neutral / in progress | `gray-500` on `gray-100` | Inquiry, Draft, Unassigned |
| Active / informational | `brand-600` on `brand-50` | Under Review, Documents Submitted, Issued |
| Positive / complete | `success-600` on `success-50` | Admitted, Enrolled, Paid, Present |
| Needs attention | `warning-600` on `warning-50` | Waitlisted, Partially Paid, Late |
| Negative / blocked | `error-600` on `error-50` | Rejected, Withdrawn, Overdue, Absent |

Build this as a single `<StatusBadge status="..." />` component with this mapping baked in once — never let individual screens invent their own status colors.

---

### 2. Typography

#### Two-Typeface System (new — this is the one deliberate departure from the base system)

The base NutaSolutions system is single-typeface (SF Pro / Inter everywhere), and that discipline **still governs all UI text** below. But Excellence Kids' wordmark is a serif — that serif is a **brand mark, not a UI font**, and should stay that way:

- **UI typeface (everything you read and interact with):** SF Pro / Inter / Geist Sans, exactly as specified in the base system. Never change this for "brand" reasons — a school's admissions form should be as legible as any other Apple-grade product.
- **Brand typeface (wordmark only):** a serif — Georgia or a licensed equivalent — used *only* for the literal "Excellence Kids" logotype and, sparingly, a marketing page hero headline if one exists. It never appears in tables, forms, buttons, or body copy.

```css
/* UI typeface — identical to base system */
html {
  font-family: -apple-system, BlinkMacSystemFont, "Geist Sans", "Inter", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Brand wordmark only — logo/hero contexts */
.brand-wordmark {
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 700;
}
```

#### Type Scale

Identical scale to the base NutaSolutions system — reuse verbatim, since Apple's hierarchy logic doesn't change per brand:

```css
--text-display: 72px / 80px;   700 weight, -0.02em tracking   /* rare — a marketing hero only */
--text-title-1: 48px / 56px;   600 weight, -0.015em tracking  /* page headings */
--text-title-2: 36px / 44px;   600 weight, -0.01em tracking   /* section headings */
--text-title-3: 28px / 36px;   600 weight, -0.005em tracking  /* subsection headings */
--text-headline: 20px / 28px;  600 weight                      /* card headers */
--text-body: 16px / 24px;      400 weight                      /* main content, form labels */
--text-callout: 17px / 26px;   400 weight                      /* emphasized body */
--text-subheadline: 15px / 22px; 400 weight                    /* secondary info, table metadata */
--text-footnote: 13px / 18px;  400 weight                      /* captions */
--text-caption: 12px / 16px;   400 weight, 0.02em tracking     /* smallest labels, e.g. badge text */
```

#### Rules specific to this product
- **Never** drop below 15px for anything a staff member must fill in or a parent must read — admissions and fee forms are read carefully and sometimes under stress; don't make legibility a variable someone has to fight.
- Status badges use `--text-caption` at 600 weight, uppercase, with the 0.02em tracking already specified — this is the one place ALL CAPS is correct, per the base system's own rule (labels/buttons only).
- Currency is always set with tabular figures (`font-variant-numeric: tabular-nums;`) in any table or list showing fee amounts, so columns of GHS amounts align.

---

### 3. Spacing, Radius, Shadows, Borders — Unchanged

Reuse the base NutaSolutions system exactly as documented there: the 8pt spacing grid, the shadow elevation levels (`--shadow-sm` through `--shadow-2xl`), the radius scale (`--radius-xs` 4px through `--radius-full`), and the border rules (borders only when shadows/spacing aren't enough, max 1px, low opacity). There is nothing education-specific about spacing math — copy those tokens verbatim into this project's `globals.css` / Tailwind config.

One addition specific to this product:

**Touch targets in staff-facing tables:** front-desk staff will often be on a touch laptop or tablet during in-person admissions. Row actions (edit, view, delete) in dense tables should still hit the 44×44px minimum target even when the row itself is visually compact — pad the clickable area beyond the visible icon if needed.

---

### 4. Glassmorphism & Materials — Unchanged

Same glass/vibrancy implementation as the base system (`.glass-light`, `.glass-dark`, `.glass-heavy`, `.glass-thin`), same rules for where to use it (navigation, sidebars, search bars, toolbars) and where not to (content areas, buttons, inputs, complex cards). No school-specific changes.

---

## 🧩 Component Notes Specific to Excellence Kids

Everything in the base system's component spec (buttons, inputs, their states, focus rings, disabled/loading treatment) applies unchanged — just swap `#3B82F6` for `--brand-600` (`#0C6C9C`) wherever the base doc references its blue. Below are the components this product needs that the base document doesn't cover.

### Status Badge

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;       /* --text-caption */
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.status-badge--neutral  { background: var(--gray-100);    color: var(--gray-600); }
.status-badge--info     { background: var(--brand-50);    color: var(--brand-700); }
.status-badge--success  { background: var(--success-50);  color: var(--success-700); }
.status-badge--warning  { background: var(--warning-50);  color: #8A4A0C; } /* darker than warning-700 for AA text contrast on light bg */
.status-badge--error    { background: var(--error-50);    color: var(--error-700); }
```

Always pair the badge with its text label (e.g. "Waitlisted"), never a bare colored dot — this is a hard accessibility requirement given how many status states this system has.

### Child/Student Avatar

Where a photo isn't available (common at initial inquiry stage, before a photo is uploaded), use an initials avatar in a **neutral gray** background, never a random or hashed brand color — reserve color for status, not decoration, even here.

```css
.avatar-placeholder {
  background: var(--gray-200);
  color: var(--gray-600);
  border-radius: var(--radius-full);
  font-weight: 600;
}
```

### Admission Stage Tracker

A horizontal (desktop) or vertical (mobile) stepper showing an application's progress through `AdmissionStage`. Completed steps use `success-600`, the current step uses `brand-600` with a subtle `--shadow-sm` lift, future steps use `gray-300`. Never use `error`/`warning` colors in the tracker itself — a rejected or waitlisted application should show the tracker frozen at its last active step plus a separate status badge, not a red step in the sequence.

### Empty States

The one place restrained illustration is welcome — e.g., "No applications yet this term." Use simple line-art in `gray-300`/`brand-200`, never a cartoon character, and never in the child's actual profile/record views (those should feel like real records, not a kids' app).

---

## 🔤 Logo Usage

Brand assets live under `public/brand/` (or the project `brand` folder during setup). Use **only** the variants that exist in the repo — do not invent mark-only or white-reversed SVGs.

Available files:

- **`excellence-kids-logo.svg`** — full color mark + wordmark + tagline. **Primary asset** for UI: navbar, marketing headers, favicon/app icon source, and anywhere the logo appears on a light or neutral background. Prefer this SVG over raster whenever possible.
- **`excellence-kids-logo-transparent.png`** — full-color raster with transparency. Use only when a consumer requires PNG (e.g. some email clients, third-party embeds), not as the default in-app mark.
- **`excellence-kids-logo-white-bg.png`** — full-color raster on a white plate. Use only when a solid white backing is required (e.g. certain print or export contexts). Prefer the SVG on screen.

Not every file needs to ship in every surface — pick the appropriate variant for the context; most product UI should use the SVG alone.

### Rules
- **Clear space:** maintain empty space around the logo equal to at least the height of one of the four figures (roughly 12% of the logo's total height) on all sides — never crop the arc.
- **Minimum size:** the full logo (with wordmark) should not render below ~120px wide in content headers, since the wordmark becomes hard to read below that. For tight chrome (favicon, compact nav), scale the same full logo SVG down rather than inventing a separate icon crop.
- **Backgrounds:** place the full-color logo on light/neutral surfaces. On `brand-600` or darker bars, give it a light plate or keep the bar light enough that the color logo remains legible — do not fabricate a white-reversed SVG.
- **Never:** recolor the four figures individually to match a seasonal theme, stretch the logo non-uniformly, add a drop shadow or outer glow to it, or place the full-color logo on a busy photo background without a solid backing plate.
- **Favicon/app icon:** derive sizes from `excellence-kids-logo.svg` (or a PNG export of that same artwork). Do not introduce a separate mark-only asset.

---

## 🗣️ Brand Voice

The tagline — *"Be a reader, be a writer, be a problem solver"* — is aspirational and addressed to the child. In-product copy should borrow that same plain, encouraging register for anything parent-facing (notifications, portal copy), while staff-facing copy (admin screens, internal tooling) stays in the same clear, neutral register as any other Apple-grade enterprise tool. Don't blend the two — a fee-overdue notice to a parent should be polite and human; the same event in the staff dashboard is just a fact in a table.

---

## ♿ Accessibility — One Addition to the Base Standard

The base system's accessibility section (keyboard nav, screen reader semantics, `prefers-reduced-motion`, focus-visible rings) applies unchanged. Add this for the school context specifically:

**Design for a wide range of staff digital literacy.** Front-desk and admissions staff at a basic school are not guaranteed to be power users of software. This means, beyond standard accessibility:
- Prefer explicit text labels over icon-only buttons in staff-facing screens, even where a purely consumer product might get away with an icon alone.
- Confirmation dialogs for anything destructive or hard to reverse (deleting an application, reversing a payment) should state the consequence in plain language, not just "Are you sure?"
- Error messages name the field and the fix ("Date of birth is required" — not "Validation failed").

---

## 🔒 Multi-Tenant Readiness (Future)

This build is intentionally single-tenant (Excellence Kids only) to move fast, but the schema underneath is already tenant-aware. When a second school is onboarded, the design system should be ready to swap:

- Brand color (`--brand-600` and its ramp) — driven by a per-`School` `brandColor` value, regenerating the ramp programmatically using the same interpolation approach used to build this palette.
- Logo — swapped per tenant using that school's provided full-color logo (SVG preferred); do not require mark-only or reversed variants.
- Wordmark typeface — default to Georgia/serif as a safe fallback if a tenant has no brand serif of their own.

Everything else in this document — spacing, radius, shadow, type scale, the base neutral grays — is intentionally tenant-agnostic and should never change per school. Consistency there is what makes the product feel like *one* well-built system serving many schools, not many different apps stapled together.

---

## ❌ Anti-Patterns to Avoid (Excellence Kids specific, in addition to the base list)

1. Cartoon mascots, bouncing icons, or nursery illustration in staff-facing screens.
2. Using green/red/orange decoratively instead of semantically — if it doesn't represent a status, don't tint it.
3. A different color per class level or per section "for fun" — resist this; the semantic status system is the only place color carries meaning.
4. Serif typeface anywhere outside the literal wordmark.
5. Bare colored dots for status with no text label.
6. Treating the parent portal's warmth as license to loosen the staff product's seriousness, or vice versa.

---

## ✅ Success Criteria

The product feels right when:
- A parent seeing the admissions status page for the first time immediately understands where their child stands, without needing a legend.
- A front-desk officer processing rapid walk-in admissions never loses time to unclear UI.
- School leadership reviewing the dashboard feels this is software serious enough to run their institution on.
- Every screen, staff or parent-facing, is unmistakably the same product — same spacing, same type scale, same one brand blue — even though the four status colors do a lot of communicating.

---

## 📞 For IDE Agents & AI Assistants

1. Read this document **and** the base NutaSolutions Design Language — this one only overrides color, typography's brand exception, and the school-specific components; everything else inherits from the base.
2. Use the exact hex values and CSS variable names given here — don't approximate or reintroduce the base system's blue by mistake.
3. Status color mapping is fixed (see Semantic Status System) — don't invent new status-to-color pairings per feature.
4. Never use the serif brand typeface outside the literal logotype.
5. When building a new component not covered here, default to the base NutaSolutions component spec and only reach for a semantic color if the component represents a real status.

---

**Document Version:** 1.0
**Scope:** Excellence Kids (NutaSchola codebase) — single-tenant build
**Companion to:** NutaSolutions Design Language & UI Philosophy v2.0
