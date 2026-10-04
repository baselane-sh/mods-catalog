# Gallery design directions (2026-10-05)

The owner delegated the design choice for the overnight build. The impeccable concept roll (seed `0e74a6f8`) assigned direction A from this ordered list. A is built. B and C are small static mockups you can open in a browser, for comparison.

| | Direction | Status | Why it could win | Risk |
| :- | :- | :- | :- | :- |
| A | Eurorack case: each mod is a module faceplate, hooks are input jacks, calls are output jacks | Built (`site/`) | "Mods" read as modules you patch in. The jacks show what a mod can do before you open it. Distinct from every plugin gallery. | Dense. A long rack scrolls far on a phone. |
| B | Claude Code's own terminal look: transcript, prompt box, band | Mockup: `b-terminal-tui.html` | The most familiar to the audience. Lightest to build. | Looks like many developer tools; low brand distinction. |
| C | Boxed-software manual: category divider boards, mods on acetate leaves, a tab rail sized by count | Mockup: `c-manual-tab-board.html` | Calm, readable, strong category wayfinding. | Reads as documentation more than a gallery. |

Direction A took two ideas from the others: the category tab rail sized by mod count (from C), and one colour kept only for the install action (cable orange).

Screenshots of A: `a-eurorack-browse-light.png`, `a-eurorack-mod-dark.png`.

To switch direction, say which one. The data, build script and page structure stay the same; only `site/lib/panel.mjs` and `site/assets/site.css` change.
