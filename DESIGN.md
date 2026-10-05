---
name: Baselane mods gallery
description: A Eurorack case for Claude Code mods. Each mod is a screen-printed faceplate, hooks are input jacks, calls are output jacks, and one orange is reserved for installing.
colors:
  ground: "#e4e5e0"
  case: "#c7c9c3"
  rail: "#2a2c2f"
  rail-highlight: "#4a4d52"
  panel: "#dcded9"
  panel-highlight: "#eceee9"
  panel-shade: "#c9cbc5"
  ink: "#141517"
  silk: "#3b3e42"
  muted: "#55595e"
  line: "#b5b8b2"
  hole: "#0c0d0e"
  nut: "#9a9d98"
  nut-highlight: "#e6e8e3"
  screw: "#a7aaa5"
  field: "#f4f5f1"
  cable-orange: "#ff6a13"
  cable-ink: "#141517"
  led-off: "#5a2a14"
  caution-amber: "#f2c200"
  focus-blue: "#1f6feb"
  risk-high: "#b3261e"
  risk-medium: "#8a5a00"
  risk-low: "#3c5a7a"
  risk-info: "#5b6066"
  cat-guard: "#b3261e"
  cat-pane: "#1f5fb0"
  cat-band: "#11795a"
  cat-command: "#5b3fb6"
  cat-sound: "#7d5f00"
  cat-style: "#a3266f"
  cat-stats: "#0f6e7d"
  cat-nudge: "#556b12"
  cat-lifecycle: "#4a5568"
  cat-render: "#7a4b22"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.02em"
  title:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.05em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.9em"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  panel: "2px"
  control: "3px"
  field: "4px"
  case: "6px"
  pill: "50%"
spacing:
  hp: "22px"
  rail: "14px"
  u3: "352px"
  row: "380px"
  gutter: "max(16px, 3vw)"
components:
  faceplate:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "22px 10px 20px"
    height: "352px"
  install-button:
    backgroundColor: "{colors.cable-orange}"
    textColor: "{colors.cable-ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  action-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  tab:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "6px 12px"
    height: "40px"
  search-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "48px"
  unreviewed-sticker:
    backgroundColor: "{colors.caution-amber}"
    textColor: "{colors.ink}"
    padding: "2px 5px"
  top-rail:
    backgroundColor: "{colors.rail}"
    textColor: "#eef0ea"
    padding: "10px max(16px, 3vw)"
---

# Design System: Baselane mods gallery

## Overview

**Creative North Star: "The Eurorack Case"**

The gallery is a modular synth case. Black anodized rails hold rows of 3U faceplates. Each mod is a flat screen-printed panel: it has a name legend, a category stripe, a few lines of silk text, a row of input jacks (the hooks it listens to) and a row of output jacks (the calls it makes on your machine), and a foot with its version and trust mark. The page reads like hardware, not like a feed of cards.

Density is high and orderly. Panels sit in strict catalog order, never ranked by decoration. Light theme is brushed aluminium on a pale grey ground. Dark theme is black anodized on near-black. Both follow the system setting. Legends are Barlow Condensed in capitals with open tracking, like DIN silk-screen. Body copy is Barlow.

Colour is rationed. The chrome is neutral grey. Category is the only hue on a panel (a stripe). Risk is a text colour on a jack label. Cable orange is held back for the action path alone.

**Key Characteristics:**
- Width of a panel follows its jack count (HP), like a real module.
- Fixed panel height (352px, 3U) between 14px rails; rows never vary in height.
- One LED per panel; it lights orange only on a completed copy.
- Ten category hues, one per category, shown only as the stripe and the tab underline.
- No gradients or shadows beyond the brushed panel and a soft lift; no neon, no glass.

## Colors

A neutral hardware palette with ten category hues and one reserved action colour.

### Primary
- **Cable Orange** (#ff6a13): the action path only. Install and copy buttons, the lit LED (brand LED in the top rail and the LED on a faceplate after a copy), and the patch cable drawn on copy. Text on it is Cable Ink (#141517). It does not change between themes.

### Secondary
- **Caution Amber** (#f2c200): the UNREVIEWED sticker on a faceplate foot and the unreviewed note on a mod page. Text on it is #141517. Amber and orange are never swapped.
- **Focus Blue** (#1f6feb, dark theme #6ea8ff): focus rings and the focused search border.

### Tertiary (category hues, stripe and tab underline)
- **Guard** (#b3261e), **Pane** (#1f5fb0), **Band** (#11795a), **Command** (#5b3fb6), **Sound** (#7d5f00), **Style** (#a3266f), **Stats** (#0f6e7d), **Nudge** (#556b12), **Lifecycle** (#4a5568), **Render** (#7a4b22). White stripe text (#fff) sits on each. Hues are the same in both themes.

### Risk (text colour on jack labels and capability rows)
- **High** (#b3261e, dark #ff7a70), **Medium** (#8a5a00, dark #f0b44c), **Low** (#3c5a7a, dark #8fb4dd), **Info** (#5b6066, dark #a9adb2). In the rack only high risk recolours a jack label; the mod page capability list shows all four as the row's risk word.

### Neutral (light theme, with dark override)
- **Ground** (#e4e5e0, dark #0e0f10): page background.
- **Case** (#c7c9c3, dark #050506): the dark gap inside a rack row behind panels.
- **Rail** (#2a2c2f, dark #2d3033) with **Rail Highlight** (#4a4d52, dark #4b4f54): top and bottom rails of the page and of each rack row.
- **Panel** (#dcded9, dark #1b1c1e), **Panel Highlight** (#eceee9, dark #242629), **Panel Shade** (#c9cbc5, dark #151617): the faceplate gradient (100deg, highlight, panel at 45%, shade).
- **Ink** (#141517, dark #eef0ea): primary text and the dark button fill. **Silk** (#3b3e42, dark #c3c6c0): description text. **Muted** (#55595e, dark #a3a7a1): labels and counts.
- **Line** (#b5b8b2, dark #34373b): hairline borders. **Field** (#f4f5f1, dark #121314): inputs and code wells.
- **Hole** (#0c0d0e), **Nut** (#9a9d98, dark #6c706b), **Nut Highlight** (#e6e8e3, dark #c5c8c2), **Screw** (#a7aaa5, dark #5d615c): hardware drawn on panels. **LED Off** (#5a2a14, dark #3a1a0c).

### Named Rules
**The Cable Orange Rule.** Orange (#ff6a13) appears on install controls and the lit LED, and on the patch cable between them. Nowhere else: not on links, not on category, not on risk, not on hover, not on focus. If a new element is orange and is not on the install path, it is wrong.

**The Amber Is Caution Rule.** Unreviewed means amber sticker, tilted -3deg, never orange and never red. Verified means a plain outlined VERIFIED seal in Ink, with no colour.

**The Stripe Carries Category Rule.** Category hue appears only on the panel stripe, the active tab, the tab underline and a hover-lit LED. Body text, borders and backgrounds never take a category hue.

## Typography

**Display and Legend Font:** Barlow Condensed (500, 700), self-hosted woff2, falling back to Barlow then system-ui.
**Body Font:** Barlow (400, 600), self-hosted woff2, falling back to system-ui.
**Mono Font:** system monospace stack (ui-monospace, SF Mono, Menlo, Consolas) for install lines, capability raw names and README code.

**Character:** a DIN-like silk-screen voice. Condensed capitals name things; plain Barlow explains them. Tabular numerals are on for the whole page.

### Hierarchy
- **Display** (700, clamp(2.4rem, 6vw, 4rem), 1.05, uppercase): mod page h1 and prose page h1.
- **Headline** (700, 1.6rem, 1.05, uppercase, +0.02em): h2. Browse h1 is a smaller display, clamp(1.9rem, 3.4vw, 2.6rem), uppercase.
- **Title** (700, 1.05rem, 1, +0.05em, uppercase): faceplate name legend. On the large mod-page plate it is 1.6rem.
- **Body** (400, 1rem, 1.55): running text. Lede 1.2rem in Silk. Intro paragraph 1.05rem. Prose and README line length 72ch to 75ch; intro 68ch.
- **Label** (700, 0.7rem to 0.78rem, +0.06em to +0.16em, uppercase, Barlow Condensed): category stripe (0.72rem, +0.14em), IN and OUT legends (0.7rem, +0.16em), jack labels (0.7rem, +0.06em), facts terms, table heads, panel foot (500, 0.72rem, +0.08em).
- **Controls** (700, 0.95rem, +0.06em to +0.08em, uppercase, Barlow Condensed): tabs and buttons. Nav links are 500, 1.05rem, +0.04em, uppercase.

### Named Rules
**The Silk-Screen Rule.** Every legend is Barlow Condensed in capitals with tracking. Sentences are never set in condensed capitals; they are Barlow sentence case.

**The Plain Words Rule.** A jack label is a short code; its meaning is spoken in plain words on hover or focus. Never show a raw hook or call name as the only label.

## Layout

Page gutter is max(16px, 3vw). Content is capped at 1400px for the browse page (utility strip and rack), 1280px for the mod page, 72ch for prose pages. The top rail is sticky (z-index 5) on wide screens and static at 640px and below.

**Rack grid.** `repeat(auto-fill, 22px)` columns, one column is 1 HP. Rows are fixed 380px: a 352px panel plus 14px of rail above and below. Rows are drawn by a repeating gradient so rails are continuous. Panels flow `row dense`.

**HP widths.** Width follows the longer of a mod's IN and OUT jack rows: up to 2 jacks is 6 HP (132px), 3 is 8 HP (176px), 4 or 5 is 10 HP (220px), 6 or more is 12 HP (264px). Classes `hp-6`, `hp-8`, `hp-10`, `hp-12` set grid-column span; widths are never inline (the CSP forbids inline style). A rack panel shows at most HP/2 - 1 jacks per row (2, 3, 4, 5) and then a `+N` count.

**Top mods row** (`rack-top`) is one rack row, height clipped to a single 380px row, hidden whenever a filter is active and omitted when stars do not differ.

**Utility strip.** Search (min 48px high, flexes from 320px), Verified switch, sort select (40px), then the category tab rail below. Tab flex weight follows mod count: w1 104px, w2 132px, w3 164px, w4 196px basis, All 88px.

**Mod page.** Three blocks in source order: head (crumb, h1, lede), plate, body. From 960px the grid is a 360px column and the content column, gap 0 by 48px: the plate spans both rows of column 1 and is sticky (top 76px); head sits in row 1 and body in row 2 of column 2, each capped at 75ch. Below 960px it is one column, gap 24px, in source order (head, then plate, then body), and the big plate hides its silk text because the lede already says it. Sections are separated by 40px. Capability list is two columns from 720px.

**Browse head.** From 1100px the intro and the install box sit side by side (`minmax(0, 1fr)` and up to 600px, gap 40px); below that the box follows the intro.

**Responsive.** Layout works from 360px. At 640px and below the tab rail becomes a single horizontally scrolling row, the search takes the full row, and the palette button spans the width.

Spacing rhythm is 4, 8, 12, 16, 20, 24, 28, 32, 40, 48. Named spacing tokens are the hardware dimensions (--hp 22px, --rail 14px, --u3 352px, --row 380px).

## Elevation & Depth

A hybrid. Panels are lifted off the case with a small dark shadow and a 1px top highlight; everything else is flat and separated by hairlines.

### Shadow Vocabulary
- **Panel at rest** (`box-shadow: 0 1px 0 rgb(255 255 255 / .25) inset, 0 2px 4px rgb(0 0 0 / .35)`): every faceplate.
- **Panel lift** (`0 1px 0 rgb(255 255 255 / .25) inset, 0 8px 18px rgb(0 0 0 / .4)` with `translateY(-2px)`): hover or focus on a rack panel link.
- **Case well** (`inset 0 2px 6px rgb(0 0 0 / .35)`): inside the rack, so panels sit in a recess.
- **Palette** (`0 24px 60px rgb(0 0 0 / .45)`, backdrop rgb(10 11 12 / .55)): the Cmd+K dialog only.
- **Switch knob** (`0 1px 2px rgb(0 0 0 / .35)`).

### Named Rules
**The Lift On Response Rule.** A panel rises only on hover or focus. Nothing else floats at rest. Shadows are soft and below the object; no hard offset shadows.

## Shapes

Hardware, not bubbles. Panels have 2px corners, buttons 3px, inputs and wells 4px, the rack case 6px, the palette 6px. Tabs are square (0 radius) with a 3px category-coloured bottom edge. Round forms are reserved for hardware: screws (9px), LED (8px; 9px in the top rail), jack nuts, the switch track (11px) and knob. Hairline borders are 1px in Line.

## Components

### Faceplate (signature)
A 3U panel, fixed 352px high, with the anatomy below in order. Rack panels are links; the mod-page plate is a div with focusable jacks.
- **Screws:** four 9px screws at the corners (4px from top and bottom, 6px from the sides), each a Screw-colour disc with a diagonal slot in Hole. Decorative, `aria-hidden`.
- **LED:** 8px disc, Led Off at rest. On hover or focus of a rack panel it turns to a white-cored disc in the category hue. It turns to cable orange (core #ffd2b3) only as the lit state after a copy.
- **Name legend:** mod name, Barlow Condensed 700, 1.05rem, uppercase, +0.05em, wraps anywhere.
- **Category stripe:** full-bleed bar (negative 10px margin) in the category hue with white 0.72rem tracked capitals naming the category.
- **Silk text:** the description, 0.8rem Silk, clamped to 4 lines on the rack; unclamped at 0.9rem on the big plate.
- **IN and OUT jack rows:** a tiny tracked label (IN, OUT) over a row of jacks. A jack is a 24px SVG ring (outer nut, dashed knurl, inner nut, dark hole) over a 0.7rem code label, in a 42px cell with 4px gap. The rack row does not wrap; the big plate wraps. A high-risk jack label is coloured risk-high. On the big plate each jack is focusable and draws its plain-words label in an Ink tooltip on hover or focus.
- **Foot:** version `v1.2.3` left; right is either the outlined VERIFIED seal (1px currentColor border, 2px radius) or the amber UNREVIEWED sticker (700, rotated -3deg).
- **HP width:** 6, 8, 10 or 12 by the longer jack row (see Layout).
- **Big plate:** max-width 360px, padding 26px 16px 24px, gap 16px, name 1.6rem, stripe 0.78rem.

### Rails
The page header and footer are the case rails: Rail fill, 2px Rail Highlight top edge, 2px black bottom edge, light text. Brand is a tracked Barlow Condensed word with an LED. The footer rail has 48px top margin. Each rack row also has 14px rails above and below its panels.

### Buttons
- **Install and copy:** Cable Orange fill, Cable Ink text, 40px high, 3px radius, 700 0.95rem condensed capitals with +0.08em. Hover `filter: brightness(1.08)`. Active adds an inset 2px rgb(0 0 0 / .35) ring. After copy the button turns Ink with Ground text and reads Copied for 1.8s.
- **Secondary (btn):** same shape in Ink fill with Ground text. Not orange.

### Install line
A bordered well (Field, 1px Line, 4px radius) holding a monospace command that scrolls horizontally, joined to a square-left orange Copy button.

### Tab rail (category filter)
Square tabs, 40px high, Panel fill, 1px Line, 3px category bottom edge. Selected tab fills with its category hue, white text, and rises 3px. Weighted widths follow category count. Arrow keys move the selection; `role` is radio-like via `aria-checked`.

### Inputs
Search field 48px, Field fill, 1px Line, 4px radius; border turns Focus Blue on focus-within. Sort select 40px. Verified is a 40x22 switch: Panel Shade track, Ink when on, Nut Highlight knob that slides 18px.

### Navigation
Top rail links in condensed capitals, #c9ccc6, hover or current page turns white with a 2px underline. Palette button is a dark well (#18191b, 1px #45484c) with a `kbd` hint, pushed right.

### Command palette
A native dialog, 640px max, Panel fill, 6px radius. Results are condensed capitals names with category right-aligned; the selected row inverts to Ink on Ground.

### Capability list (mod page)
Two columns, hooks and calls, risky first. Each row is a 64px risk word in the risk colour (condensed 0.72rem capitals), the plain-words sentence in 600, and the raw name in mono 0.8rem Muted, with a hairline above.

### Patch cable (signature interaction)
On a successful copy, a 4px round-capped cable-orange SVG curve is drawn from the button centre to the LED centre, sagging at least 90px, over 0.7s, held, then faded and removed at 1.7s. Skipped under reduced motion; the LED still lights for 1.8s.

### Notes
Verified note: Panel fill, check icon. Unreviewed note: Amber fill, Ink text, 600, warn icon. Both 4px radius, 12px by 14px padding.

### Install path
The parts that take a visitor from landing to two pasted lines. Keep all of them; they carry the product's main job.
- **Install box (browse):** "Install in two steps" (h2, 1.25rem) in a Panel well with a 1px Line border and 4px radius, beside the intro. Step 1 is the marketplace line with a Copy button. Step 2 is the pattern `/plugin install <name>@baselane-mods` in a dashed Line well with Silk text and the `<name>` placeholder in Ink 600; it has no Copy button because it is not a real command.
- **Numbered steps:** an `ol` of steps, 14px apart. Each step is a 28px circle numeral (Barlow Condensed 700, 2px Ink ring, no fill) beside a sentence-case label and the install line under it. The same steps appear on the browse box and on the mod page.
- **Step 3, use it (mod page):** shown only when the mod registers a slash command (`command.run` hook or `$.command.register`). It reads "Use it: type `/name` in Claude Code." with the command in a small Field chip. Names come from the hook filter or the mod's own description; with none found it says the README names it. It has no Copy button.
- **Risk summary (mod page):** a Panel well directly above the install steps and below the trust note. The highest risk word (condensed capitals in the risk colour) leads "Its riskiest abilities:", then up to three plain-words lines in 600, then a link to the full capability list. A mod with no hooks and no calls shows one Info line instead. This keeps Trust Is Visible: risk is read before the lines are copied.
- **Setup note (mod page):** under the install steps, a Panel well with a 1px Line border, warn icon, "Needs setup." in 600 and then the author's own sentence, quoted, never written by us. Shown only when the description says the mod does nothing "until you set" something. Not amber: amber stays the Unreviewed mark.
- **IN/OUT key (browse):** one line beside the "All mods" heading, 0.9rem Muted: IN jacks are what a mod listens to, OUT jacks are what it does on your machine, a red label means high risk. IN and OUT are set as condensed 0.8rem Ink legends to match the plates.
- **Install lines on phones:** at 640px and below the command wraps (`overflow-wrap: anywhere`) instead of scrolling, so the whole line is visible before copy.

## Motion

- **Easing:** `cubic-bezier(.16, 1, .3, 1)` (--ease), an expo-out, on every transition.
- **Durations:** 0.15s button filter; 0.2s tab, tooltip and palette; 0.25s switch; 0.3s LED; 0.35s panel lift; 0.4s brand LED; 0.7s cable draw; 0.5s cable fade. Cable cleanup timers: 1.1s done, 1.7s removed.
- **Filtering:** panels are hidden with the `hidden` attribute, not animated. Filter input is debounced 60ms.
- **Reduced motion:** under `prefers-reduced-motion: reduce` all transition and animation durations drop to .01ms and the patch cable is not drawn.

## Do's and Don'ts

### Do:
- **Do** keep cable orange (#ff6a13) to install controls, the lit LED and the cable between them.
- **Do** size a new panel by its longer jack row into 6, 8, 10 or 12 HP, using the `hp-N` classes.
- **Do** keep every rack panel at 352px tall between 14px rails, with the anatomy in order: screws, LED, name, stripe, silk text, IN, OUT, foot.
- **Do** colour the stripe, the active tab and the tab underline by the category hue, via the `cat-*` class custom property.
- **Do** set legends in Barlow Condensed capitals with tracking, and sentences in Barlow.
- **Do** mark unreviewed mods with the tilted amber sticker and say so in plain words on the mod page.
- **Do** keep the page keyboard operable: 2px Focus Blue outline with 2px offset, 40px minimum control height, jacks focusable on the big plate only.
- **Do** keep everything as CSS custom properties on `:root` with the dark overrides in the `prefers-color-scheme: dark` block.
- **Do** use the SVG sprite (`#i-jack`, search, copy, check, warn, arrow) for icons; draw hardware, do not import icon fonts.
- **Do** avoid em-dashes in all UI text.

### Don't:
- **Don't** use orange for links, hover, focus, selection, category, risk or decoration.
- **Don't** turn the gallery into a grid of same-size rounded cards with an icon, title and star count.
- **Don't** put a focusable element inside a rack panel link; rack jacks stay plain.
- **Don't** use inline styles or inline scripts; the CSP forbids them. Widths come from classes.
- **Don't** show category colour as a background or text colour outside the stripe and tab.
- **Don't** rank or badge-cloud panels; catalog order and a printed version legend are the finish.
- **Don't** add hard offset shadows, glows, glass or gradients other than the panel brushing and the LED sheen.
- **Don't** change the Verified seal into a colour badge; it stays an outlined Ink seal.
- **Don't** add system display faces for legends; condensed legends come from the self-hosted Barlow Condensed.

## Not canonized

Header, footer and palette-button colours (#eef0ea, #c9ccc6, #a9aca7, #b9bcb6, #e3e5df, #d7dad4, #18191b, #45484c, #7b7f84) are hard-coded in site.css rather than tokens; they are recorded here as values the build uses, not as new tokens.
