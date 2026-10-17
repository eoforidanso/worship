import { useEffect } from 'react'
import { useContent } from '../store/useContent'
import { describeDay } from './lectionary'
import { setLitColour } from './redraw'

/** Keep the slide renderer on the service date's liturgical colour. */
export function useLiturgicalColour() {
  const date = useContent((s) => s.plan.date)
  useEffect(() => {
    let live = true
    if (!date) return setLitColour('')
    describeDay(date)
      .then((d) => live && setLitColour(d?.color))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [date])
}
