---
name: 'RepClub: Clubhouse'
description: A compact college gym clubhouse with open sections and lime actions.
colors:
  accent: '#b9f25b'
  accent-text-light: '#426500'
  bg-dark: '#191d22'
  panel-dark: '#20252d'
  panel-alt-dark: '#2f3742'
  text-dark: '#e5e9ee'
  muted-dark: '#aab8ca'
  line-dark: '#3e4959'
  control-line-dark: '#748295'
  hover-dark: '#2a323e'
  accent-ink-dark: '#131519'
  accent-soft-dark: '#212a16'
  positive-dark: '#75d294'
  positive-soft-dark: '#172c1b'
  pending-dark: '#fecf7f'
  pending-soft-dark: '#2f2618'
  danger-dark: '#efa39d'
  danger-soft-dark: '#39211f'
  purple-dark: '#c3b5ed'
  purple-soft-dark: '#292435'
  blue-dark: '#aac8ee'
  blue-soft-dark: '#252e3d'
  bg-light: '#eff5fc'
  panel-light: '#fbfdff'
  panel-alt-light: '#e5ecf6'
  text-light: '#222428'
  muted-light: '#4c596b'
  line-light: '#cbd6e5'
  control-line-light: '#79879b'
  hover-light: '#e5ecf6'
  accent-ink-light: '#222428'
  accent-soft-light: '#e5eedb'
  positive-light: '#00652c'
  positive-soft-light: '#d9f1dd'
  pending-light: '#845d00'
  pending-soft-light: '#f5ead9'
  danger-light: '#b3332d'
  danger-soft-light: '#ffe6e3'
  purple-light: '#7154a8'
  purple-soft-light: '#efebf6'
  blue-light: '#365e94'
  blue-soft-light: '#e4edf8'
typography:
  page-title:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 28px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.025em
  page-title-mobile:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.025em
  headline:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 20px
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: -0.02em
  workout-name:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: -0.02em
  body:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-relaxed:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  control:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.5
  field:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  surface: 24px
  panel: 28px
  field: 16px
  popup: 20px
  option: 14px
  pill: 999px
  circle: 50%
spacing:
  '4': 4px
  '8': 8px
  '12': 12px
  '16': 16px
  '20': 20px
  '24': 24px
  '28': 28px
  '32': 32px
components:
  button-primary-dark:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink-dark}'
    typography: '{typography.control}'
    rounded: '{rounded.pill}'
    padding: 10px 16px
  button-secondary-dark:
    backgroundColor: '{colors.panel-dark}'
    textColor: '{colors.text-dark}'
    typography: '{typography.control}'
    rounded: '{rounded.pill}'
    padding: 10px 16px
  input-dark:
    backgroundColor: '{colors.panel-alt-dark}'
    textColor: '{colors.text-dark}'
    typography: '{typography.field}'
    rounded: '{rounded.field}'
    padding: 10px 12px
  panel-dark:
    backgroundColor: transparent
    textColor: '{colors.text-dark}'
    rounded: 0px
    padding: 0px
  button-primary-light:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink-light}'
    typography: '{typography.control}'
    rounded: '{rounded.pill}'
    padding: 10px 16px
  button-secondary-light:
    backgroundColor: '{colors.panel-light}'
    textColor: '{colors.text-light}'
    typography: '{typography.control}'
    rounded: '{rounded.pill}'
    padding: 10px 16px
  input-light:
    backgroundColor: '{colors.panel-alt-light}'
    textColor: '{colors.text-light}'
    typography: '{typography.field}'
    rounded: '{rounded.field}'
    padding: 10px 12px
  panel-light:
    backgroundColor: transparent
    textColor: '{colors.text-light}'
    rounded: 0px
    padding: 0px
  button-text:
    textColor: '{colors.accent}'
    padding: '0'
  button-text-light:
    textColor: '{colors.accent-text-light}'
    padding: '0'
  button-icon:
    rounded: '{rounded.circle}'
    padding: 10px
    width: 44px
    height: 44px
  select:
    rounded: '{rounded.pill}'
    padding: 10px 14px
  number-field:
    rounded: '{rounded.field}'
  navigation:
    rounded: '{rounded.pill}'
    padding: 8px 12px
  status-label:
    typography: '{typography.label}'
    padding: 4px 0 4px 8px
---

# Design System: RepClub: Clubhouse

## Overview

**Creative North Star: "Clubhouse"**

Clubhouse is the user-selected direction for RepClub, recorded on 3 November 2026 after comparing Training log, Clubhouse and Focus. OpenDesigner supplied the starting system and option gallery; Clubhouse maps to its tonal direction. Impeccable's Operate, craft-floor, clarify and polish guidance refines the implementation. The approved Clubhouse variant in `../repclub-mockups.html` is the concept reference; `app/globals.css` and the shipped components are the implementation source of truth.

Quiet typography, open neutral space and lime actions support a private squad of college gym members in India. Home places three recent workout summaries and the weekly commitment together, with workout entry beside them on desktop. All activity opens on a separate screen. Squad standings are collapsed until requested, and workout controls come first on smaller screens. League, achievements and the staff desk retain their existing functions. The visual language stays compact and friendly through rows, separators and rounded controls, while attendance and reward status remain explicit.

**Key Characteristics:**

- Squad activity and weekly commitment lead the home surface.
- Lime identifies primary actions in both light and dark themes.
- Open, borderless sections contain tasks; rows and separators organise repeated content.
- Compact entry controls preserve a clear place to save details and finish a scan.

## Colors

A single lime action accent sits on cool, softly layered neutrals; attendance and achievement colours carry product meaning rather than decoration. The frontmatter records source values for both themes. Unqualified CSS custom properties resolve to dark by default; `[data-theme="light"]` supplies the light mapping.

### Primary

- **Club Lime** (`accent`): the shared primary-action fill and dark-theme accent text.
- **Lime Ink** (`accent-ink-dark`, `accent-ink-light`): readable primary-button labels matched to the active theme.
- **Deep Lime** (`accent-text-light`): links, selection marks, caret and focus outlines on light surfaces.
- **Lime Wash** (`accent-soft-dark`, `accent-soft-light`): brief pressed feedback on numeric controls. Decorative highlight boxes and selected-state fills are removed.

### Secondary

- **Attendance Green** (`positive-*`, `positive-soft-*`): verified attendance and completed steps or days.
- **Review Amber** (`pending-*`, `pending-soft-*`): pending staff review and duration warnings.
- **Attention Red** (`danger-*`, `danger-soft-*`): declined states, errors and destructive hover feedback.
- **Achievement Violet** (`purple-*`, `purple-soft-*`) and **Achievement Blue** (`blue-*`, `blue-soft-*`): existing achievement and XP treatments. They do not replace the lime action accent.

### Neutral

- **Club Slate / Cool Page** (`bg-dark`, `bg-light`): the page and sticky header.
- **Raised Slate / Chalk Surface** (`panel-dark`, `panel-light`): functional controls, dialogs and popups. Weekly commitment, workout entry and navigation remain unfilled.
- **Inset Slate / Blue Mist** (`panel-alt-dark`, `panel-alt-light`): fields, numbers, avatars and quiet inset areas.
- **Primary Ink** (`text-*`) and **Secondary Ink** (`muted-*`): the text hierarchy.
- **Soft Separator** (`line-*`): list dividers and static boundaries. **Control Edge** (`control-line-*`) gives interactive fields and secondary buttons a stronger boundary.
- **Hover Surface** (`hover-*`): secondary-button, navigation and icon-control feedback.

The CSS sidebar and track aliases reuse panel and inset values. They are not separate colour primitives. Synthesised tonal strips in the sidecar are panel previews, not additional application tokens or validated contrast pairs.

**The Lime Action Rule.** Use the shared lime fill for primary actions and its theme-specific ink for the label. Use the darker accent-text token for links and focus in the light theme.

**The Status Has Words Rule.** Pair attendance colour with a text status and an icon or step; colour alone does not explain verification or reward eligibility.

## Typography

**Interface Font:** system-ui, with the existing Apple, BlinkMacSystemFont, Segoe UI and sans-serif fallbacks. There is no independent display face. The wordmark uses the same family with its existing weight and compact tracking.

**Character:** direct, compact application type. Size and weight organise the work; subdued labels recede without disappearing. No fixed modular ratio is imposed over the observed size steps.

### Hierarchy

- **Page title:** the `page-title` role, switching to `page-title-mobile` at the phone navigation breakpoint.
- **Section headline:** `headline` for weekly commitment, squad activity and workout-entry headings. Compact squad progress and exercise subsections also use the existing 16px heading size.
- **Workout name:** `workout-name` for the editable title and elapsed-time emphasis; feed workout titles use the existing 20px semibold treatment.
- **Body:** `body` for the base interface and `body-relaxed` for workout notes and explanatory session text. Session explanation is limited to (48ch) in source.
- **Control:** `control` for action buttons; navigation and exercise names use the observed 14px interface size.
- **Field:** `field` for editable values. Phone modal, search, date, select and numeric fields retain at least (16px) text.
- **Label:** `label` for metadata, dates, status and subordinate control labels. Do not manufacture an uppercase eyebrow style from these labels.

**The Interface Type Rule.** Use the existing system stack for application headings and controls. Numeric data uses tabular figures; animation belongs to derived totals, never editable caret text.

## Layout

The Clubhouse shell uses a centred container (1320px maximum) with desktop side gutters (24px), a sticky header row (64px minimum) and horizontal navigation. A quiet wordmark, campus/profile access and appearance controls sit in that header. The home grid gives activity the flexible column and uses `minmax(300px, 360px)` for the personal column, separated by (24px). Weekly commitment precedes activity; workout entry precedes squad progress and setup.

The spacing base is (4px). Repeated within-group gaps use (8px) and (12px); section spacing uses (12px) and (16px), with (24px) reserved for the desktop column gap. The header navigation has (4px) bottom padding, main content starts (16px) below it, and page headings leave (16px) below. Weekly commitment and workout entry have no enclosing fill, border, corner treatment or internal shell padding. Repeated activity and exercise content uses separators and rows rather than a grid of nested cards.

| Source breakpoint | Observed response |
| --- | --- |
| At most 1000px | Side gutters become 20px; the personal column is 320px and the home-column gap becomes 20px. |
| At most 800px | Home becomes one column with a 16px section gap and workout controls ahead of community content. An opened editor hides other personal-column blocks. Otherwise the personal area uses two columns. |
| At most 760px | Horizontal navigation gives way to bottom navigation with a safe-area inset; the header row stays at least 64px. Main content uses 16px gutters and leaves `calc(80px + env(safe-area-inset-bottom))` at the bottom. Bottom-navigation targets are at least 56px high. The mobile Start/Finish shortcut is hidden while the inline editor is open. |
| At most 520px | Main gutters become 12px and personal content stacks. Task sections stay unboxed without shell padding. Entry metadata and numeric controls reflow into two columns. |
| At most 360px | Header-action spacing and the mobile scan shortcut compact further. |
| Coarse pointer above 520px | Numeric inputs sit above their decrement/increment row; step targets retain at least 44px width. |

The editor footer is sticky: (16px) above the desktop and tablet bottom, then `calc(64px + env(safe-area-inset-bottom))` on phones. These are source declarations, not browser-measured clearances. Sticky offsets, long content and keyboard interaction still need browser capture and interaction review.

## Elevation & Depth

Hierarchy comes from typography, whitespace and separators. Decorative filled or outlined highlight boxes are removed across summaries, notices and selected navigation. The shared card shadow is `none`; feed rows explicitly remove the legacy card shell. Primary-button hover mixes lime with the panel instead of adding glow. Floating elements retain purpose-specific soft shadows.

### Shadow Vocabulary

- **Popup:** `0 8px 24px #00000024` for the exercise and activity menus.
- **Dialog:** `0 30px 100px #00000050`, with backdrop `#080b12a8` and backdrop blur (5px).

**The Flat Task Rule.** Keep task sections, summaries, notices and feed rows transparent and borderless. Reserve enclosing surfaces and shadows for functional popups and dialogs. Retain editable fields, action buttons, QR contrast and keyboard focus.

Motion is brief and tied to state: shared colour transitions (160ms), popup fade/translation (160ms ease-out), exercise insertion/removal (160ms), derived NumberFlow totals (180ms) and the application MotionConfig default (200ms). Existing goal/cheer feedback and a completed-goal celebration remain in the build. CSS disables animation and transitions for reduced motion; MotionConfig respects the user preference and celebration checks it explicitly. These are implementation facts, with interaction verification still outstanding.

## Shapes

Task sections are open and square edged without enclosing surfaces. Dialogs use `panel`, fields use `field`, popups use `popup`, and their options use `option`. Single-line actions use the `pill` radius; navigation selection uses accent text and weight without a filled pill. Avatars, weekly day markers and icon controls use circular silhouettes. Feed rows and exercise rows stay unboxed, with thin separators. The workout-name field is the deliberate underline-only exception to inset field styling.

The inherited league, achievement and staff surfaces still contain smaller corner treatments. This pass records the Clubhouse home and entry vocabulary without silently converting every legacy detail into a new shared token.

## Components

### Buttons

Compact, rounded actions with a clear task hierarchy. Primary and secondary buttons use the pill shape, a minimum height (44px), horizontal/vertical padding (16px/10px), and the control type role. Primary fill is Club Lime with the active theme's Lime Ink. Secondary buttons use the surface, primary text and Control Edge.

Primary hover uses `color-mix(in srgb, var(--accent) 88%, var(--panel))`; secondary hover uses Hover Surface and a Secondary Ink border. Keyboard focus is a (2px) accent-text outline with (3px) offset. Disabled buttons use opacity (0.45) and the not-allowed cursor. Text actions use accent text and underline on hover; icon controls are circular, with at least (44px) targets and tonal hover feedback.

Use one primary action per task group. Saving workout details remains a separate action from scan checkout; the editor saves details before opening checkout so typed exercises are preserved. The sidecar contains source-derived primary, secondary, text and icon variants, with theme variables kept live.

### Chips

Attendance uses a quiet text-and-icon status label. In the Clubhouse feed it has a transparent background, zero corner radius and left inset (8px); verified, pending and declined use their semantic foregrounds. Manual and history-only labels use Secondary Ink. Generic status treatments also remain transparent outside the feed. Keep status meaning in the words as well as colour.

### Cards / Containers

Weekly commitment, workout entry, summaries and legacy cards have transparent backgrounds, no enclosing borders, no corner treatment and no resting shadows. Home task sections have zero shell padding. Activity and exercises flow as separated rows. Home shows three compact workout summaries; at 1100px and above their identity and actions share one row, with title and metrics beneath. Notes and exercises remain available in Details and the separate all-activity screen. Squad standings use a collapsed disclosure.

### Inputs / Fields

Fields feel inset and compact. Modal and date inputs use Inset Slate / Blue Mist, a Control Edge border, field corners and minimum height (44px). The workout name uses an underline and larger editable text. Search uses a surface background, icon and pill outline; activity selection uses the inset tone and a pill silhouette.

Base UI owns autocomplete, selects and numeric entry. Exercise names allow free text. Previous values require an explicit tap and typing never gets overwritten. Only one exercise row expands at a time. Numeric groups use field corners, a centred tabular value and decrement/increment controls; coarse pointers receive the reflow documented in Layout. Focus-within uses a (2px) accent-text outline with (2px) offset. A fieldset disables editing during a request; inline errors use Attention Red and a clear message.

### Navigation

Desktop navigation is a horizontal set of text controls with Secondary Ink at rest, Primary Ink on hover and semibold accent text when selected. There is no filled selected-state box. The selected item exposes `aria-current="page"`. Phone bottom navigation uses the surface tone, a top separator, safe-area padding and accent text for the active destination. Icons, where present, are inline SVG controls with accessible labels; decorative heading icons are outside the chosen home and entry direction.

### Weekly commitment and status timeline

The week is a seven-column strip of circular day markers. Completed and pending days use semantic text and icons; today and planned days retain their circular outline or dashed marker. Goal and day controls keep their selection behaviour with accent text, weight and an underline instead of filled highlight boxes. The detail timeline separates scan-in, scan-out, review and reward outcome; it changes from four columns to two at the narrow breakpoint. Empty, loading, error, pending, declined, manual and out-of-range states must use real product data and clear recovery actions. Product eligibility remains defined in `PRODUCT.md`; styling must not imply rewards before qualification.

### Verification limits and uncanonized drift

The managed preview service is unavailable because `/tmp/sites-previewd/requests` is absent. No screenshots, computed browser measurements or phone-camera checks exist for this implementation. The reviewer resolved five findings from source flow and contrast inspection, but the disposition remains **recapture** until browser evidence is available. Source checks and the production build can run; an offline detector result is source evidence, not visual approval.

The compact uppercase onboarding step label is a pre-existing eyebrow treatment carried by the build, not a design rule for future screens. Smaller legacy corner sizes and other inherited page details are reported as drift, not repaired or promoted by this documentation-only pass. The system stack is application type; it does not establish a separate system-font display style.

## Do's and Don'ts

### Do:

- **Do** preserve brand lime and the complete light and dark theme mappings.
- **Do** use one primary action per task group and keep saving details distinct from scan checkout.
- **Do** organise activity and exercises with rows and separators and keep opened workout entry before the feed on narrow screens.
- **Do** use real data and a clear recovery action for empty, loading, error, pending, declined, manual and out-of-range states.
- **Do** keep phone fields at least 16px, retain useful coarse-pointer touch areas, and respect reduced-motion preferences.

### Don't:

- **Don't** reintroduce filled or outlined highlight boxes for task sections, summaries, notices, icon tiles or selected tabs.
- **Don't** introduce nested cards, metric-tile dashboards, decorative heading icons, eyebrows, progress rings or repeated reward explanations into the approved home and entry surfaces.
- **Don't** replace an exercise name or previous values while the person is typing; reusing previous values requires an explicit tap.
- **Don't** imply that manual history, missing checkout, out-of-range duration or pending review has already earned rewards.
- **Don't** describe source checks or the offline detector as browser approval, responsive measurement or phone-camera verification.
