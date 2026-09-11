import { useMemo, useRef, useState } from 'react'
import { useContent } from '../store/useContent'

// Above this size a file is kept as an object URL for the session only —
// stuffing a 20MB data URI into localStorage would blow the quota.
const PERSIST_LIMIT = 2 * 1024 * 1024

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

  const onFiles = async (files) => {
    for (const file of files) {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      const url =
        file.size <= PERSIST_LIMIT ? await readAsDataURL(file) : URL.createObjectURL(file)
      addMedia({ name: file.name, type, url, tags: [], persisted: file.size <= PERSIST_LIMIT })
    }
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
        {shown.map((m) => (
          <figure key={m.id} className="media-card">
            {m.type === 'video' ? (
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
                {m.type === 'image' && (
                  <button className="icon-btn" title="Use as logo" onClick={() => setLogo(m.url)}>
                    {logoUrl === m.url ? '★' : '☆'}
                  </button>
                )}
                <button className="icon-btn danger" onClick={() => removeMedia(m.id)} title="Remove">
                  ×
                </button>
              </span>
              {m.persisted === false && (
                <span className="muted small">Session only — too large to save</span>
              )}
            </figcaption>
          </figure>
        ))}
        {shown.length === 0 && <p className="empty">Drop images or videos here, or use “Add files”.</p>}
      </div>
    </div>
  )
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function promptForUrl(addMedia) {
  const url = window.prompt('Image or video URL')
  if (!url) return
  const type = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? 'video' : 'image'
  addMedia({ name: url.split('/').pop() ?? 'Remote media', type, url, tags: ['remote'] })
}
