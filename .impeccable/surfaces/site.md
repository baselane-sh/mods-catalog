---
version: 1
slug: "site"
primary_target: "site"
related_targets: []
---

## Scope

The gallery site at mods.baselane.sh: browse (/), mod page (/mods/<name>/), submit (/submit/), 404. Visitor mode: Operate. Task: find a mod, judge what it can do, copy the install line.

## Direction contract

THESIS: The gallery is a Eurorack case. Each mod is a module faceplate: hooks are its input jacks (events it listens to), calls are its output jacks (what it does to your machine). It refuses the category default, a grid of same-size rounded cards with an icon, a title and a star count on a dark page with a neon accent.

OWN-WORLD: Black anodized rails with slotted mounting holes hold the rows. Faceplates are flat screen-printed panels: brushed aluminium (light theme) or black anodized (dark theme), legends in a DIN-like condensed sans (Barlow Condensed, self-hosted), knurled jack nuts drawn as SVG rings, one LED per module. Category is the panel's silk-screen stripe colour (ten hues, one per category). One colour is reserved for the action path: patch-cable orange #FF6A13, used only on install controls and the active jack. Unverified mods carry an amber caution sticker, never orange.

STORY: The visitor scans the rack, filters it like a utility module, opens one faceplate, reads its jacks in plain words (risky outputs first), and patches it in: copies the two install lines.

FIRST VIEWPORT: A full-width utility strip (search field, category switch row as a stepped tab rail sized by count, Verified toggle, sort) sits on the top rail. Below it, the Top mods row: eight modules of real width on one rail. Then the full rack, rows of faceplates wrapping by HP width. The ⌘K palette opens over the rack. The primary action on a mod page, the install block, sits beside the faceplate above the fold.

FORM: Eurorack modular synth case and module panels, candidate 3 of my ordered list (1 Claude Code TUI, 2 electronic parts datasheet, 3 Eurorack modules, 4 Drug Facts label, 5 blister-card pegboard, 6 library card catalog, 7 game mod manager). Seed key 0e74a6f8.
Raise from the manual acetate tab board (competitive): the category switch is a stepped tab rail whose tab widths follow each category's mod count.
Raise from the orienteering map (declined): one colour, cable orange, is reserved for the action path and nothing else.
Raise from the Saville sleeve (declined): strict catalog order, every module shows its name and version as a printed legend, never a badge cloud.
Signature interaction: hovering or focusing a jack draws its plain-words label; copying an install line plugs a short cable from the button to the LED, which lights.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Brand character for the gallery: proposed later, the owner decides.
