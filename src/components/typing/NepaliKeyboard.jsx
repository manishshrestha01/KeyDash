import React, { useMemo } from 'react'
import { KEY_ROWS } from '../../assets/nepali/keyboardLayouts'
import { formatNepali, INPUT_METHODS } from '../../utils/nepaliIme'

/**
 * On-screen Nepali keyboard guide.
 *
 * Each physical key shows the Devanagari it produces in the active layout, derived
 * live via formatNepali() so the guide never drifts from the real engine output.
 * The key that produces the next character to type is highlighted.
 *
 * Props:
 * - inputMethod: 'traditional' | 'romanized'
 * - nextChar: the next Devanagari character the user needs to produce (for highlight)
 */
const BASE_W = 9  // w-9  (mobile)
const BASE_W_SM = 11 // sm:w-11
const BASE_H = 9
const BASE_H_SM = 11

const NepaliKeyboard = ({ inputMethod, nextChar }) => {
  // Derive base/shift glyphs for every character key once per layout.
  const charKeys = useMemo(
    () =>
      KEY_ROWS.flat().filter((k) => !k.type).map(([base, shift]) => ({
        base,
        shift,
        baseGlyph: formatNepali(base, inputMethod),
        shiftGlyph: formatNepali(shift, inputMethod),
      })),
    [inputMethod]
  )

  const rows = useMemo(
    () =>
      KEY_ROWS.map((row) =>
        row.map((entry) => {
          if (entry.type === 'mod') {
            return { type: 'mod', label: entry.label, w: entry.w }
          }
          const [base, shift] = entry
          return {
            base,
            shift,
            baseGlyph: formatNepali(base, inputMethod),
            shiftGlyph: formatNepali(shift, inputMethod),
          }
        })
      ),
    [inputMethod]
  )

  // Determine if the next character needs Shift (matches any key's shiftGlyph).
  const shiftNeeded = useMemo(() => {
    if (!nextChar) return false
    return charKeys.some((k) => k.shiftGlyph === nextChar)
  }, [charKeys, nextChar])

  const layoutName = INPUT_METHODS[inputMethod]?.name || ''

  return (
    <div className="mt-6 select-none">
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-xs sm:text-sm text-gray-500">
          {layoutName} layout · the highlighted key types the next character
        </span>
      </div>
      <div className="bg-[#1a1f2e] border border-gray-700/50 rounded-xl p-2 sm:p-3 overflow-x-auto">
        <div className="flex flex-col gap-1 min-w-max mx-auto w-fit">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-1">
              {row.map((key, ki) => {
                if (key.type === 'mod') {
                  const isShift = key.label === 'Shift'
                  const isCaps = key.label === 'Caps'
                  const highlightShift = isShift && shiftNeeded
                  return (
                    <div
                      key={`mod-${ki}`}
                      style={{ width: `${key.w * BASE_W * 4}px` }}
                      className={`
                        flex items-center justify-center rounded-md h-9 sm:h-11
                        text-[10px] sm:text-xs font-semibold tracking-wide
                        transition-colors select-none
                        ${highlightShift
                          ? 'bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400/50'
                          : isCaps
                            ? 'bg-gray-700/50 text-gray-500 border border-gray-700/60'
                            : 'bg-gray-800/70 text-gray-400 border border-gray-700/60'
                        }
                      `}
                    >
                      {key.label}
                    </div>
                  )
                }
                const highlightBase = Boolean(nextChar) && key.baseGlyph === nextChar
                const highlightShift = !highlightBase && Boolean(nextChar) && key.shiftGlyph === nextChar
                const highlighted = highlightBase || highlightShift
                return (
                  <div
                    key={key.base}
                    className={`
                      flex flex-col items-center justify-center rounded-md
                      w-9 h-9 sm:w-11 sm:h-11 text-center transition-colors shrink-0
                      ${highlighted
                        ? 'bg-yellow-400 text-gray-900 ring-2 ring-yellow-300'
                        : 'bg-gray-800/70 text-gray-300 border border-gray-700/60'
                      }
                    `}
                    title={`${key.base}${key.shiftGlyph !== key.baseGlyph ? ` / Shift+${key.base}` : ''}`}
                  >
                    <span className="text-[10px] sm:text-xs leading-none font-mono opacity-60">
                      {key.base}
                    </span>
                    <span className={`text-sm sm:text-base leading-none ${highlightShift ? 'font-bold' : ''}`}>
                      {key.baseGlyph}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          {/* Spacebar row */}
          <div className="flex justify-center mt-1">
            <div
              className={`
                flex items-center justify-center rounded-md h-7 sm:h-8 w-40 sm:w-56
                transition-colors select-none text-[10px] sm:text-xs
                ${nextChar === ' '
                  ? 'bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400/50'
                  : 'bg-gray-800/70 border border-gray-700/60 text-gray-500'
                }
              `}
            >
              {nextChar === ' ' ? 'Space' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NepaliKeyboard
