import { useEffect } from 'react'
import { useContent } from '../store/useContent'

/**
 * Keeps a secondary window (projector, stage) in step with edits made in the
 * operator window. Zustand's persist middleware writes to localStorage, and
 * `storage` fires in every *other* tab on the same origin — so rehydrating on
 * that event is enough to pick up plan and theme changes mid-service.
 */
export function useContentSync() {
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'worship-content-v1') useContent.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
}
