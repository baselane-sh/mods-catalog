import type { StyleRule } from '../engine'

// The rule names the character by its code point and never contains it.
export const rule: StyleRule = {
  id: 'no-em-dash',
  section:
    'Style: never write the em-dash character (Unicode U+2014, the long horizontal dash). Use a comma, a colon, a period or parentheses instead. This covers prose, lists, headings, code comments and any file content you write. A hyphen inside a word stays allowed.',
}
