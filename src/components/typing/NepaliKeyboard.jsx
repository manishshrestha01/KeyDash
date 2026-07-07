import React, { useMemo } from 'react'
import { KEY_ROWS } from '../../assets/nepali/keyboardLayouts'
import { formatNepali, INPUT_METHODS } from '../../utils/nepaliIme'

/**
 * On-screen Nepali keyboard guide — fully responsive.
 *
 * Each physical key shows the Devanagari it produces in the active layout, derived
 * live via formatNepali() so the guide never drifts from the real engine output.
 * The key that produces the next character to type is highlighted.
 *
 * Props:
 * - inputMethod: 'traditional' | 'romanized'
 * - nextChar: the next Devanagari character the user needs to produce (for highlight)
 */

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

  const modFlex = (w) =>
    w === 1.75 ? 'flex-[1.75]' : w === 2.25 ? 'flex-[2.25]' : w === 2.75 ? 'flex-[2.75]' : 'flex-[1.5]'

  return (
    <div className="mt-4 sm:mt-6 select-none w-full max-w-2xl mx-auto px-1 sm:px-0">
      <div className="flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
        <span className="text-[10px] sm:text-xs text-gray-500 text-center leading-tight">
          {layoutName} layout · the highlighted key types the next character
        </span>
      </div>
      <div className="bg-[#1a1f2e] border border-gray-700/50 rounded-lg sm:rounded-xl p-1.5 sm:p-3">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-0.5 sm:gap-1 w-full">
              {row.map((key, ki) => {
                if (key.type === 'mod') {
                  const isShift = key.label === 'Shift'
                  const isCaps = key.label === 'Caps'
                  const highlightShift = isShift && shiftNeeded
                  return (
                    <div
                      key={`mod-${ki}`}
                      className={`
                        ${modFlex(key.w)}
                        flex items-center justify-center rounded h-7 sm:h-10
                        text-[8px] sm:text-[10px] font-semibold tracking-wide
                        transition-colors select-none truncate px-0.5
                        ${highlightShift
                          ? 'bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400/50'
                          : isCaps
                            ? 'bg-gray-700/50 text-gray-400 border border-gray-700/60'
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
                      flex-1 min-w-0 flex flex-col items-center justify-center rounded
                      h-7 sm:h-10 text-center transition-colors
                      ${highlighted
                        ? 'bg-yellow-400 text-gray-900 ring-1 ring-yellow-300'
                        : 'bg-gray-800/70 text-gray-300 border border-gray-700/60'
                      }
                    `}
                    title={`${key.base}${key.shiftGlyph !== key.baseGlyph ? ` / Shift+${key.base}` : ''}`}
                  >
                    <span className="text-[7px] sm:text-[10px] leading-none font-mono opacity-50">
                      {key.base}
                    </span>
                    <span className={`text-[10px] sm:text-sm leading-none ${highlightShift ? 'font-bold' : ''} truncate max-w-full px-0.5`}>
                      {key.baseGlyph}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          {/* Spacebar row */}
          <div className="flex mt-0.5 sm:mt-1">
            <div
              className={`
                flex-1 min-w-0 flex items-center justify-center rounded
                h-6 sm:h-8 transition-colors select-none text-[8px] sm:text-[10px]
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
