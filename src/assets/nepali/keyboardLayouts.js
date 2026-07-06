// Physical US-QWERTY key layout, used purely to position keys on the on-screen
// Nepali keyboard guide. The Devanagari glyph shown on each key is derived at
// render time by running the key through the active layout's transliterator
// (formatNepali), so the guide always matches what typing actually produces —
// no separate mapping table to keep in sync.
//
// Each key is [base, shifted] as produced without / with the Shift key.
// Modifier key descriptor. `label` is shown on the keycap; `w` is the width
// multiplier relative to a regular key (default 1).
const mod = (label, w = 1.5) => ({ type: 'mod', label, w })

export const KEY_ROWS = [
  [
    ['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'],
    ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+'],
  ],
  [
    ['q', 'Q'], ['w', 'W'], ['e', 'E'], ['r', 'R'], ['t', 'T'], ['y', 'Y'],
    ['u', 'U'], ['i', 'I'], ['o', 'O'], ['p', 'P'], ['[', '{'], [']', '}'], ['\\', '|'],
  ],
  [
    mod('Caps', 1.75), ['a', 'A'], ['s', 'S'], ['d', 'D'], ['f', 'F'], ['g', 'G'],
    ['h', 'H'], ['j', 'J'], ['k', 'K'], ['l', 'L'], [';', ':'], ["'", '"'],
  ],
  [
    mod('Shift', 2.25), ['z', 'Z'], ['x', 'X'], ['c', 'C'], ['v', 'V'], ['b', 'B'],
    ['n', 'N'], ['m', 'M'], [',', '<'], ['.', '>'], ['/', '?'], mod('Shift', 2.75),
  ],
]
