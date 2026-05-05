---
name: Visa Forte
description: "Engineered for Passage. — Premium Canadian immigration consulting practice."
colors:
  prussian: "#0C2340"
  saffron: "#C97B1E"
  pearl: "#F8F4EE"
  teal: "#1A5C72"
  ink: "#1A2B3C"
  sand: "#E2DBD1"
  amber: "#EDD9B0"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 3.6rem)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(1.125rem, 2vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "DM Sans, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "DM Sans, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "0.65rem"
    fontWeight: 600
    letterSpacing: "0.28em"
rounded:
  none: "0px"
spacing:
  section-v: "7rem"
  section-v-sm: "5rem"
  gutter: "2.5rem"
  gutter-md: "1.5rem"
  gutter-sm: "1.25rem"
  text-width: "740px"
  max-width: "1200px"
components:
  button-primary:
    backgroundColor: "{colors.saffron}"
    textColor: "{colors.prussian}"
    rounded: "{rounded.none}"
    padding: "1.05rem 2.6rem"
  button-primary-hover:
    backgroundColor: "{colors.pearl}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.pearl}"
    rounded: "{rounded.none}"
    padding: "1rem 2.4rem"
  nav-cta:
    backgroundColor: "{colors.saffron}"
    textColor: "{colors.prussian}"
    rounded: "{rounded.none}"
    padding: "0.6rem 1.4rem"
---

# Design System: Visa Forte

## 1. Overview

**Creative North Star: "The Chartered Practice"**

This is a serious professional firm. Every element carries the weight of documented process and legal precision. The design communicates that a real expert operates here — not a platform, not a portal, not a startup with a gradient — a practice that has guided hundreds of clients through the same procedural journey and knows every obstacle. When a referred prospect lands on any Visa Forte surface, the design's job is not to convince from zero; it is to confirm what they already believe.

The visual language is grounded in restraint. Prussian blue anchors every surface in authority. Saffron appears as a precision instrument — sparingly, on the most credible, the most actionable, the most important. Pearl grounds the experience in warmth, far from clinical white. Nothing is rounded; nothing floats; nothing animates for its own sake. This is the design equivalent of a firm handshake.

The system explicitly rejects: generic SaaS aesthetics (gradient heroes, hero-metric templates, ghost buttons on dark backgrounds); cheap immigration portal styling (blue-and-white government-adjacent surfaces, stock flag photography, poor contrast); over-designed agency excess (parallax, floating blobs, neon splashes, cursor effects, glassmorphism as decoration); and old-school legal firm stiffness (gold serif wordmarks on dark navy, tombstone layouts, cold formality). It also refuses anything that causes visual fatigue — comfortable reading is a design feature, not an afterthought.

**Key Characteristics:**
- Zero border-radius throughout: square corners signal seriousness, not consumer softness
- Flat elevation: authority comes from color and type, never from shadow depth
- Saffron as a precision instrument: used on ≤10% of any screen; its rarity is the point
- Pearl canvas: warm off-white, never clinical white, always approachable
- Cormorant Garamond for display only: the serif carries authority; DM Sans carries clarity
- Uppercase labels and buttons: the visual language of official process and documentation

## 2. Colors: The Visa Forte Palette

A tight seven-color system anchored in a Prussian-Saffron-Pearl triad. Every color has a defined role; none is decorative.

### Primary
- **Prussian** (#0C2340): The authority color. Navigation bar, major headings, admin surface headers, portal header, and any element that must communicate "this is the firm." Deep almost-black navy with enough blue to feel precise rather than cold.

### Secondary
- **Teal** (#1A5C72): Inline anchor text, navigation links, secondary action states. Sits between Prussian authority and Pearl ground — professional trust without Prussian's heaviness.

### Tertiary
- **Amber** (#EDD9B0): Warm secondary accent for document progress states, secondary highlights, and complementary fills. Lighter and softer than Saffron; provides warmth without competing for attention.

### Neutral
- **Pearl** (#F8F4EE): The default body background on every public-facing and authenticated surface. Never white — the off-white warmth prevents clinical sterility and signals approachability.
- **Ink** (#1A2B3C): Primary body text. A very dark navy rather than black — tinted toward the brand hue for cohesion across the system.
- **Sand** (#E2DBD1): Borders, dividers, subtle input backgrounds. The quiet structural color that defines boundaries between Pearl surfaces without adding visual weight.
- **Saffron** (#C97B1E): The accent. CTAs, progress bar fills, eyebrow labels, rule elements, hover states, the tagline in the nav. Warm, authoritative, rare. Never used as a background for large surfaces.

### Named Rules
**The Saffron Scarcity Rule.** Saffron appears on ≤10% of any given screen. Its rarity is precisely why it commands attention. Over-use collapses the contrast hierarchy and makes CTAs invisible in noise.

**The No-White Rule.** Never use pure `#fff` or `#000`. Pearl (#F8F4EE) is the lightest neutral in the system; Prussian (#0C2340) is the darkest. Every color is tinted toward the brand hue. Pure white introduces clinical coldness; pure black is blunt.

## 3. Typography

**Display Font:** Cormorant Garamond (with Georgia, serif fallback)
**Body Font:** DM Sans (with Helvetica Neue, Helvetica, system-ui fallback)

**Character:** An editorial serif paired with a modern humanist sans. Cormorant Garamond brings classical authority and weight to display headlines; DM Sans provides precision and legibility at small sizes and UI contexts. The contrast between them is the personality of the practice itself — experience expressed through form, action expressed through clarity.

### Hierarchy
- **Display** (Cormorant Garamond, 400 weight, clamp(2rem, 4vw, 3.6rem), line-height 1.12, letter-spacing -0.012em): Hero headlines, section titles, the most significant statement on any given page.
- **Headline** (Cormorant Garamond, 400 weight, clamp(1.125rem, 2vw, 1.375rem), line-height 1.3): Sub-section headers, card titles, portal section headings. Still authoritative, more intimate.
- **Body** (DM Sans, 400 weight, 0.875rem, line-height 1.65): All body copy. Maximum line length 65–75ch, enforced by `--text-w: 740px`. Comfortable reading is non-negotiable.
- **Label** (DM Sans, 600 weight, 0.65rem, letter-spacing 0.28em, uppercase): Eyebrow labels above sections, navigation links, button text, status badges. The voice of official process and procedural precision.

### Named Rules
**The Serif Ceiling Rule.** Cormorant Garamond is reserved for display and headline roles exclusively. Never use the display serif for body copy, navigation, or any UI element at or below 1rem — DM Sans owns that register without exception.

**The Uppercase Protocol.** Labels, navigation, buttons, and eyebrow text are always uppercase with wide letter-spacing (0.10–0.28em). This is the visual language of official documentation and procedural authority. Do not undercut it with mixed-case in UI contexts.

## 4. Elevation

This system is flat by design. No `box-shadow` appears anywhere in the current implementation. Depth is communicated entirely through color contrast and spatial relationships: Prussian surfaces recede into authority, Pearl surfaces sit at ground level, Sand borders define structural boundaries, and Saffron elements come forward through color alone.

The one structural exception: the navigation bar uses `backdrop-filter: blur(16px)` on a semi-transparent Prussian background. This is a legibility necessity when scrolling over page content — it is not a decorative choice and should not be replicated elsewhere.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. No `box-shadow` on buttons, cards, inputs, or containers. Depth is earned through color contrast, not shadow illusion. If an element needs to feel elevated, give it a Prussian background — not a drop shadow.

## 5. Components

### Buttons
The firm has no soft edges. Every button is square-cornered (border-radius: 0) and sharp by intention. Softness would undermine the authority the whole system is built on.

- **Shape:** No border-radius (0px). Hard edges throughout.
- **Primary** (`.btn-primary`): Saffron background (#C97B1E), Prussian text (#0C2340), DM Sans 600, 0.82rem, uppercase, letter-spacing 0.1em, padding 1.05rem 2.6rem. On hover: Pearl background (#F8F4EE). Color shift only at 0.22s ease — no transform, no scale.
- **Outline** (`.btn-outline`): Transparent background, Pearl text (#F8F4EE), 1px border at rgba(248,244,238,0.22), same font as Primary, padding 1rem 2.4rem. On hover: border opacity to 0.55, text stays Pearl. Used exclusively on Prussian backgrounds.
- **Ghost/Link** (`.link-ghost`): Pearl text at 42% opacity, 1px bottom border at 18% opacity, 0.75rem, uppercase, letter-spacing 0.12em. On hover: full Pearl opacity and border at 50%. Tertiary actions on dark surfaces only.
- **Nav CTA** (`.nav-cta`): Same as Primary but compact — padding 0.6rem 1.4rem. Lives exclusively in the fixed navigation bar.

### Inputs / Fields
Form fields follow the same sharp-cornered vocabulary. No border-radius on any input, select, or textarea element.

- **Style:** 1px border (Sand #E2DBD1 at rest), Pearl or white background, DM Sans body text, 0.875rem.
- **Focus:** Prussian border color (#0C2340); no glow, no `box-shadow` — the border shift is the complete signal.
- **Error:** Red border (#b91c1c); inline error text in red below the field. No background fill on error state.
- **Labels:** DM Sans, uppercase, 0.65–0.7rem, letter-spacing 0.16–0.20em. Labels sit above fields, never float inside them.

### Navigation
Fixed top bar. Three zones — brand left, links center, actions right.

- **Background:** Prussian at 97% opacity (`rgba(12,35,64,0.97)`) with `backdrop-filter: blur(16px)`. A 1px Saffron bottom border at 18% opacity.
- **Wordmark:** Cormorant Garamond, 1.2rem, 600 weight, uppercase, letter-spacing 0.14em, Pearl — always "VISA FORTE."
- **Tagline:** DM Sans, 0.6rem, uppercase, letter-spacing 0.22em, Saffron — "Engineered for Passage." Always present, never omitted.
- **Links:** DM Sans, 0.7rem, 500 weight, uppercase, letter-spacing 0.15em. Pearl at 50% opacity at rest; Pearl at 100% with a Saffron underline on hover and active state.
- **Mobile:** Hamburger appears at 768px breakpoint. Prussian drawer below the nav with stacked links.

### Cards / Containers
Cards are not the default answer. Use them only where grouping requires a clear boundary that cannot be expressed through spacing alone.

- **Background:** Pearl (#F8F4EE) on neutral surfaces; Prussian (#0C2340) for elevated or high-priority states.
- **Border:** 1px Sand (#E2DBD1) on Pearl surfaces. Saffron full border only for ITA Window or high-priority alert states.
- **Shadow:** None. Flat always.
- **Internal Padding:** 1.5rem–2rem.

### Signature Component: The Saffron Rule
A 40px wide × 2px tall Saffron bar (`.rule`, color #C97B1E) placed between the section eyebrow/headline block and body content beneath. It appears on nearly every major section of the public site and portal dashboard. This is a Visa Forte signature element — do not replace it with a gap, a divider, a full-width border, or anything else.

## 6. Do's and Don'ts

### Do:
- **Do** use Cormorant Garamond for display (≥1.5rem) and DM Sans for everything else. The serif ceiling is strict and non-negotiable.
- **Do** place the Saffron Rule (40px × 2px, #C97B1E) between the eyebrow/headline and body content in every major section.
- **Do** display "Engineered for Passage" as the permanent nav tagline in Saffron (#C97B1E). It is a fixed asset — never alter, never omit.
- **Do** keep border-radius at 0px on all interactive elements: buttons, inputs, cards, badges, chips.
- **Do** use uppercase with letter-spacing (≥0.10em) for all navigation links, button labels, and eyebrow text.
- **Do** set body copy on Pearl (#F8F4EE) with Ink (#1A2B3C) text at comfortable line lengths (max 65–75ch via `--text-w: 740px`).
- **Do** keep Saffron usage to ≤10% of any given screen. Use it to mark the most important action or the most critical information.
- **Do** use the flat elevation model throughout. No `box-shadow` on buttons, cards, or containers.
- **Do** include `prefers-reduced-motion` overrides on all `.r` reveal animations. WCAG 2.1 AA compliance is required.

### Don't:
- **Don't** use gradient hero sections, gradient text (`background-clip: text`), or hero-metric templates (big number + small label + gradient accent). This is the generic SaaS trap that Visa Forte is defined against.
- **Don't** apply cheap immigration portal patterns: blue-and-white government-adjacent styling, stock flag photography, poor contrast ratios, or typographic negligence.
- **Don't** add parallax effects, decorative floating blobs, neon splashes, excessive motion, or cursor effects. These destroy the trust signal this domain requires.
- **Don't** use old-school legal firm aesthetics: gold serif wordmarks on dark navy, tombstone-style layouts, Latin language, cold formality. Precise and warm are not opposites.
- **Don't** use any border-radius on interactive elements. Not 4px. Not 2px. Not 1px. Zero.
- **Don't** add `box-shadow` to buttons, cards, or containers. Flat is a deliberate system choice.
- **Don't** use Saffron as a large-surface background color. It belongs on rules, highlights, badges, CTAs, and hover states only.
- **Don't** use pure `#fff` or `#000`. Pearl is the lightest neutral. Prussian is the darkest.
- **Don't** set body copy in Cormorant Garamond. The Serif Ceiling Rule is absolute.
- **Don't** design anything that causes visual fatigue. If a user has to squint or fight the layout, it has failed the system's core commitment.
- **Don't** use `border-left` or `border-right` greater than 1px as a decorative colored stripe on cards, alerts, or list items. The ITA Window uses a full Saffron border (all four sides), not a side stripe.
- **Don't** use glassmorphism decoratively. The nav blur is a structural necessity for legibility; everywhere else it is prohibited.