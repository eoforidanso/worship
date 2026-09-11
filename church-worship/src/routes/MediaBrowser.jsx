import { useEffect, useMemo, useRef, useState } from 'react'
import { useContent } from '../store/useContent'
import { putMedia, deleteMedia, storageEstimate } from '../lib/mediaStore'
import { uid } from '../lib/id'

export default function MediaBrowser() {
  const media = useContent((s) => s.media)
  const addMedia = useContent((s) => s.addMedia)
  const updateMedia = useContent((s) => s.updateMedia)
  const removeMedia = useContent((s) => s.removeMedia)
  const setLogo = useContent((s) => s.setLogo)
  const logoUrl = useContent((s) => s.logoUrl)

  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const fileRef = useRef(null)

  const tags = useMemo(() => [...new Set(media.flatMap((m) => m.tags))].sort(), [media])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return media.filter((m) => {
      if (activeTag && !m.tags.includes(activeTag)) return false
      if (!q) return true
      return m.name.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q))
    })
  }, [media, query, activeTag])

  // filename -> 0..1 while bytes are being written to IndexedDB.
  const [importing, setImporting] = useState({})

  const onFiles = async (files) => {
    for (const file of files) {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      const id = uid('md')
      setImporting((p) => ({ ...p, [file.name]: 0 }))
      try {
        const url = await putMedia(id, file, (p) =>
          setImporting((prev) => ({ ...prev, [file.name]: p })),
        )
        addMedia({ id, name: file.name, type, url, size: file.size, tags: [], offline: true })
      } catch (err) {
        // Out of quota, or storage unavailable. Say so rather than adding an
        // entry that would draw nothing on Sunday.
        console.warn('[media] could not store', file.name, err)
        window.alert(`Couldn't save “${file.name}” for offline use.\n\n${err?.message ?? err}`)
      } finally {
        setImporting((p) => {
          const { [file.name]: _, ...rest } = p
          return rest
        })
      }
    }
  }

  const onRemove = async (id) => {
    await deleteMedia(id).catch(() => {})
    removeMedia(id)
  }

  return (
    <div className="media">
      <div className="media-toolbar">
        <input
          className="search"
          placeholder="Search media…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
          Add files
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles([...e.target.files])
            e.target.value = ''
          }}
        />
        <button className="btn" onClick={() => promptForUrl(addMedia)}>
          Add by URL
        </button>
      </div>

      {tags.length > 0 && (
        <div className="tag-row">
          <button className={`chip${activeTag == null ? ' on' : ''}`} onClick={() => setActiveTag(null)}>
            All
          </button>
          {tags.map((t) => (
            <button
              key={t}
              className={`chip${activeTag === t ? ' on' : ''}`}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div
        className="media-grid"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFiles([...e.dataTransfer.files])
        }}
      >
        {Object.entries(importing).map(([name, progress]) => (
          <figure key={`importing-${name}`} className="media-card media-importing">
            <div className="media-placeholder">
              <span>Preparing offline copy…</span>
              <progress value={progress} max={1} />
            </div>
            <figcaption>
              <span className="media-name">{name}</span>
              <span className="muted small">{Math.round(progress * 100)}%</span>
            </figcaption>
          </figure>
        ))}
        {shown.map((m) => (
          <figure key={m.id} className={`media-card${m.url ? '' : ' media-missing'}`}>
            {!m.url ? (
              // Never a broken image icon: say what's wrong instead.
              <div className="media-placeholder">
                <span>Unavailable offline</span>
              </div>
            ) : m.type === 'video' ? (
              <video src={m.url} muted loop onMouseEnter={(e) => e.target.play()} onMouseLeave={(e) => e.target.pause()} />
            ) : (
              <img src={m.url} alt={m.name} loading="lazy" />
            )}
            <figcaption>
              <input
                className="media-name"
                value={m.name}
                onChange={(e) => updateMedia(m.id, { name: e.target.value })}
              />
              <input
                className="media-tags"
                placeholder="tags, comma separated"
                value={m.tags.join(', ')}
                onChange={(e) =>
                  updateMedia(m.id, {
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
              <span className="media-actions">
                <span
                  className={`dot dot-${mediaState(m)}`}
                  title={
                    {
                      offline: `Saved offline${m.size ? ` — ${formatSize(m.size)}` : ''}`,
                      remote: 'Online only — needs the network',
                      missing: 'Not stored on this machine',
                    }[mediaState(m)]
                  }
                />
                {m.type === 'image' && m.url && (
                  <button className="icon-btn" title="Use as logo" onClick={() => setLogo(m.url, m.id)}>
                    {logoUrl === m.url ? '★' : '☆'}
                  </button>
                )}
                <button className="icon-btn danger" onClick={() => onRemove(m.id)} title="Remove">
                  ×
                </button>
              </span>
            </figcaption>
          </figure>
        ))}
        {shown.length === 0 && Object.keys(importing).length === 0 && (
          <p className="empty">Drop images or videos here, or use “Add files”.</p>
        )}
      </div>

      <StorageFooter media={media} />
    </div>
  )
}

/** What's actually held offline, and how much room is left for it. */
function StorageFooter({ media }) {
  const [est, setEst] = useState(null)
  useEffect(() => {
    storageEstimate().then(setEst)
  }, [media.length])

  const offline = media.filter((m) => mediaState(m) === 'offline').length
  const missing = media.filter((m) => mediaState(m) === 'missing').length

  return (
    <p className="muted small storage-footer">
      {offline} of {media.length} saved offline
      {missing > 0 && ` · ${missing} unavailable`}
      {est &&
        ` · ${formatSize(est.usage)} used of ${formatSize(est.quota)} available`}
    </p>
  )
}

/**
 * offline — bytes are in the local store, guaranteed to work with no network.
 * remote  — a URL we'd have to fetch; fine at home, not at a venue.
 * missing — referenced by the plan but the bytes aren't here.
 */
export function mediaState(m) {
  if (m.offline === false) return 'remote'
  return m.url ? 'offline' : 'missing'
}

function formatSize(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`
}

/**
 * Remote media is the one thing that can't be guaranteed offline — it is
 * fetched over the network and isn't in the local store, so it's marked
 * `offline: false` and shows a grey dot.
 */
function promptForUrl(addMedia) {
  const url = window.prompt('Image or video URL')
  if (!url) return
  const type = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? 'video' : 'image'
  addMedia({ name: url.split('/').pop() ?? 'Remote media', type, url, tags: ['remote'], offline: false })
}
