/**
 * Things every slide canvas must redraw for, beyond its own props:
 *  - `tick` bumps when web fonts finish loading (a canvas drawn before its
 *    font arrived would otherwise keep the fallback face for good);
 *  - `litColour` is the liturgical colour of the service date, which the
 *    built-in themes can use as their background.
 */

import { create } from 'zustand'

export const useRedraw = create(() => ({ tick: 0, litColour: '', litSeason: '' }))

export const bumpRedraw = () => useRedraw.setState((s) => ({ tick: s.tick + 1 }))
// `litSeason` (ADVENT, LENT, EASTER…) tunes how much ornament the slides carry.
export const setLitColour = (litColour, litSeason = '') =>
  useRedraw.setState({ litColour: litColour || '', litSeason: litSeason || '' })

if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener?.('loadingdone', bumpRedraw)
}
