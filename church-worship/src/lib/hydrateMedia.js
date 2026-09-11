/**
 * Re-attach stored media at boot.
 *
 * Every surface — operator, projector, stage — runs this before it draws.
 * Until it resolves, media-backed slides have no URL to draw, which is why
 * callers wait on `mediaReady` rather than painting a background-less slide
 * and then popping the image in a frame later.
 */

import { hydrateAll, urlFor, storedIds, requestPersistence } from './mediaStore'
import { useContent } from '../store/useContent'

export const mediaReady = (async () => {
  try {
    await hydrateAll()
    const stored = await storedIds()
    useContent.getState().attachMediaUrls(urlFor, stored)
    // Best-effort: ask not to be evicted between prep and Sunday.
    requestPersistence()
    return true
  } catch (err) {
    // A blocked or unavailable IndexedDB (private mode, locked profile) must
    // not stop the service starting — text slides still work.
    console.warn('[media] hydration failed; media will be unavailable', err)
    return false
  }
})()
