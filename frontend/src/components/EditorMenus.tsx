import type { Editor } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'

// Notion-like editing surface: formatting lives in TipTap BubbleMenu (selection),
// block types in TipTap FloatingMenu (empty line). No hand-rolled toolbar state.
export default function EditorMenus({ editor, onSuggest, onSentenceStarter, counts, showWordCount }: {
  editor: Editor; onSuggest: () => void; onSentenceStarter: () => void
  counts: { words: number; chars: number }; showWordCount: boolean
}) {
  const link = () => { const url = prompt('Link URL'); if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); else editor.chain().focus().unsetLink().run() }
  return <>
    <div className="editor-bar">
      <button className="bar-ai" onMouseDown={e => e.preventDefault()} onClick={onSuggest} title="Request ghost completions at caret">Suggest <span className="kbd">Ctrl Space</span></button>
      <button className="bar-ai" onMouseDown={e => e.preventDefault()} onClick={onSentenceStarter} title="Insert a transition / sentence starter at caret">Sentence starter <span className="kbd">Ctrl /</span></button>
      <span className="meta bar-hint">Select text → format · Empty line → block menu · Type <span className="kbd">/</span> hints in Settings → Shortcuts</span>
      <span className="spacer" />
      {showWordCount && <span className="metric">{counts.words} words · {counts.chars} chars</span>}
    </div>

    <BubbleMenu editor={editor} className="bubble-menu" options={{ placement: 'top', offset: 8 }}
      shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive('codeBlock')}>
      <button className={editor.isActive('bold') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl B)"><strong>B</strong></button>
      <button className={editor.isActive('italic') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl I)"><em>I</em></button>
      <button className={editor.isActive('underline') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl U)"><u>U</u></button>
      <button className={editor.isActive('strike') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></button>
      <button className={editor.isActive('highlight') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">▮</button>
      <button className={editor.isActive('code') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">{'</>'}</button>
      <span className="tool-sep" />
      {[1, 2, 3].map(l => <button key={l} className={editor.isActive('heading', { level: l }) ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: l as 1 | 2 | 3 }).run()}>H{l}</button>)}
      <button className={editor.isActive('blockquote') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">❝</button>
      <span className="tool-sep" />
      <button className={editor.isActive('bulletList') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">•</button>
      <button className={editor.isActive('orderedList') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1.</button>
      {(['left', 'center', 'right'] as const).map(a => <button key={a} className={editor.isActive({ textAlign: a }) ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign(a).run()} title={`Align ${a}`}>{a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}</button>)}
      <span className="tool-sep" />
      <button className={editor.isActive('link') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={link}>Link</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">Clear</button>
    </BubbleMenu>

    <FloatingMenu editor={editor} className="floating-menu" options={{ placement: 'left-start', offset: 8 }}
      shouldShow={({ editor: e }) => { const { selection } = e.state; const { $anchor, empty } = selection; return empty && $anchor.parent.type.name === 'paragraph' && $anchor.parent.textContent === '' }}>
      <div className="floating-title">Add block</div>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setParagraph().run()}>¶ Text</button>
      {[1, 2, 3].map(l => <button key={l} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: l as 1 | 2 | 3 }).run()}>H{l} Heading {l}</button>)}
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()}>• Bullet list</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Numbered list</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{'</>'} Code block</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setHorizontalRule().run()}>― Divider</button>
    </FloatingMenu>
  </>
}
