import React, { useEffect, useRef, useState } from 'react'
import {
  Settings,
  UserRound,
  CircleHelp,
  LogOut,
} from "lucide-react";
import type { LibraryEntry, ExploreConversation } from '../data/mockLibrary'
import { blip } from '../lib/sfx'

export interface LibraryProps {
  entries: LibraryEntry[]
  activeId: string | null
  onSelect: (id: string) => void
  conversations: ExploreConversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onToggleCollapse?: () => void
  onOpenSettings?: () => void
  onOpenHelp?: () => void
  onRemoveEntry?: (id: string) => void
}

type DockTab = 'conversation' | 'library'

/** Left dock — two sections: Conversation (prompting space) and Library (saved collection).
 * Bottom: profile row with a drop-up menu (Settings, Profile, Help, Logout).
 */
export default function Library({ entries, activeId, onSelect, conversations, activeConversationId, onSelectConversation, onNewConversation, onToggleCollapse, onOpenSettings, onOpenHelp, onRemoveEntry }: LibraryProps) {
  const [tab, setTab] = useState<DockTab>('conversation')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(t)
  }, [notice])

  const stub = (label: string) => {
    blip('select')
    setMenuOpen(false)
    setNotice(`${label} — coming soon in this workspace.`)
  }

  const menuItems = [
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      fn: () => {
        blip("open");
        setMenuOpen(false);
        onOpenSettings?.();
      },
    },
    {
      id: "profile",
      label: "Profile",
      icon: UserRound,
      fn: () => stub("Profile"),
    },
    {
      id: "help",
      label: "Help",
      icon: CircleHelp,
      fn: () => {
        blip("open");
        setMenuOpen(false);
        onOpenHelp?.();
      },
    },
    {
      id: "logout",
      label: "Logout",
      icon: LogOut,
      fn: () => stub("Logout"),
    },
  ];

  return (
    <div className="dock" style={{ height: '100%', display: 'flex', flexDirection: 'column', margin: 0, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div role="tablist" aria-label="Left dock sections" style={{ display: 'inline-flex', gap: 2, background: 'var(--hover)', borderRadius: 6, padding: 2 }}>
          {([['conversation', 'Prompts'], ['library', 'Saved']] as Array<[DockTab, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => { blip('select'); setTab(id) }}
              style={{
                padding: '3px 10px',
                minHeight: 24,
                fontSize: 12,
                fontWeight: tab === id ? 700 : 500,
                borderRadius: 4,
                border: 'none',
                background: tab === id ? 'var(--paper)' : 'transparent',
                color: tab === id ? 'var(--ink)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {onToggleCollapse && (
          <button type="button" onClick={onToggleCollapse} title="Collapse dock" style={{ padding: '2px 8px', minHeight: 24 }}>‹</button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {tab === 'conversation' ? (
          conversations.length === 0 ? (
            <div>
              <p className="meta">Prompting space — ask a question in Explore to start a thread.</p>
              <button type="button" className="primary" onClick={() => { blip('select'); onNewConversation() }} style={{ marginTop: 6, borderRadius: 999, padding: '5px 14px', fontSize: 12 }}>
                New prompt
              </button>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => { blip('select'); onNewConversation() }} style={{ width: '100%', marginBottom: 8, borderRadius: 6, padding: '6px 10px', fontSize: 12.5, fontWeight: 600 }}>
                + New prompt
              </button>
              {conversations.map(c => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { blip('select'); onSelectConversation(c.id) }}
                  onKeyDown={ev => { if (ev.key === 'Enter') onSelectConversation(c.id) }}
                  className={'dock-item' + (activeConversationId === c.id ? ' dock-selected' : '')}
                  title={c.query}
                >
                  <div className="quote-serif" style={{ fontSize: 13.5 }}>{c.query}</div>
                  <div className="meta">{new Date(c.createdAt).toLocaleDateString()} · summary + table</div>
                </div>
              ))}
            </>
          )
        ) : entries.length === 0 ? (
          <p className="meta">Saved collection — save a row from Explore to keep it here.</p>
        ) : (
          entries.map(e => (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => { blip('select'); onSelect(e.id) }}
              onKeyDown={ev => { if (ev.key === 'Enter') onSelect(e.id) }}
              className={'dock-item' + (activeId === e.id ? ' dock-selected' : '')}
              title={e.detail || e.kind}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div className="quote-serif" style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{e.title}</div>
                {onRemoveEntry && (
                  <button
                    type="button"
                    title="Remove from Saved"
                    aria-label={`Remove ${e.title}`}
                    onClick={ev => { ev.stopPropagation(); blip('dismiss'); onRemoveEntry(e.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, padding: '0 2px', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="meta">{e.kind}{e.detail ? ` · ${e.detail}` : ''}</div>
              {e.claim && <div style={{ fontSize: 12.5, marginTop: 4 }}>{e.claim}</div>}
              {e.excerpt && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>“{e.excerpt}”</div>}
              {e.url && <div style={{ marginTop: 4 }}><a href={e.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, wordBreak: 'break-all' }} onClick={ev => ev.stopPropagation()}>{e.url}</a></div>}
            </div>
          ))
        )}
      </div>
      {notice && (
        <div role="status" style={{ fontSize: 11.5, color: 'var(--muted)', padding: '4px 2px' }}>{notice}</div>
      )}
      <div ref={menuRef} style={{ position: 'relative', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {menuOpen && (
          <div
            role="menu"
            aria-label="Profile menu"
            className="fade"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
              zIndex: 60,
              padding: '4px 0',
            }}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button key={item.id} type="button" role="menuitem" onClick={item.fn} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={() => { blip('toggle'); setMenuOpen(v => !v) }}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="Profile menu"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, minHeight: 34, textAlign: 'left' }}
        >
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ai)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Writer</span>
            <span className="meta" style={{ display: 'block', fontSize: 11 }}>Local workspace</span>
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{menuOpen ? '▾' : '▴'}</span>
        </button>
      </div>
    </div>
  )
}
