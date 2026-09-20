/**
 * A deterministic stand-in for @tiptap/react in tests. jsdom doesn't
 * implement the Selection/Range behavior ProseMirror needs to handle real
 * typing in a contentEditable element, so simulating keystrokes against the
 * real editor is unreliable. This fakes just enough of the API surface
 * (a single text block with toggleable marks/heading/list, driven by
 * toolbar commands and a fake contentEditable's input event) for
 * AnnouncementRichTextEditor and its consumers to be tested end to end
 * through onChange, without depending on ProseMirror's DOM internals.
 */
import { useMemo, useRef, useState } from 'react'
import type { AnnouncementRichDoc, AnnouncementRichMark } from '@/types'

interface MockState {
  text: string
  marks: Set<'bold' | 'italic'>
  headingLevel: 2 | 3 | null
  listType: 'bulletList' | 'orderedList' | null
}

function buildDoc(state: MockState): AnnouncementRichDoc {
  const marks: AnnouncementRichMark[] = [...state.marks].map((type) => ({ type }))
  const textContent = state.text ? [{ type: 'text' as const, text: state.text, ...(marks.length ? { marks } : {}) }] : undefined

  let block: AnnouncementRichDoc['content'][number] = state.headingLevel
    ? { type: 'heading', attrs: { level: state.headingLevel }, content: textContent }
    : { type: 'paragraph', content: textContent }

  if (state.listType) {
    block = { type: state.listType, content: [{ type: 'listItem', content: [{ type: 'paragraph', content: textContent }] }] }
  }

  return { type: 'doc', content: [block] }
}

export function useEditor({ onUpdate }: { onUpdate?: (args: { editor: unknown }) => void } = {}) {
  const [, forceRender] = useState(0)
  const stateRef = useRef<MockState>({ text: '', marks: new Set(), headingLevel: null, listType: null })

  const editor = useMemo(() => {
    function emitUpdate() {
      forceRender((n) => n + 1)
      onUpdate?.({ editor: api })
    }

    function toggleMark(mark: 'bold' | 'italic') {
      if (stateRef.current.marks.has(mark)) stateRef.current.marks.delete(mark)
      else stateRef.current.marks.add(mark)
    }

    function chainBuilder() {
      const ops: Array<() => void> = []
      const builder = {
        focus: () => builder,
        toggleBold: () => { ops.push(() => toggleMark('bold')); return builder },
        toggleItalic: () => { ops.push(() => toggleMark('italic')); return builder },
        toggleHeading: ({ level }: { level: 2 | 3 }) => {
          ops.push(() => { stateRef.current.headingLevel = stateRef.current.headingLevel === level ? null : level })
          return builder
        },
        toggleBulletList: () => {
          ops.push(() => { stateRef.current.listType = stateRef.current.listType === 'bulletList' ? null : 'bulletList' })
          return builder
        },
        toggleOrderedList: () => {
          ops.push(() => { stateRef.current.listType = stateRef.current.listType === 'orderedList' ? null : 'orderedList' })
          return builder
        },
        run: () => {
          ops.forEach((op) => op())
          emitUpdate()
        },
      }
      return builder
    }

    const api = {
      isEmpty: false, // read via getter below; placeholder for TS shape
      chain: chainBuilder,
      isActive: (type: string, attrs?: { level?: number }) => {
        if (type === 'bold') return stateRef.current.marks.has('bold')
        if (type === 'italic') return stateRef.current.marks.has('italic')
        if (type === 'heading') return attrs?.level ? stateRef.current.headingLevel === attrs.level : stateRef.current.headingLevel != null
        if (type === 'bulletList') return stateRef.current.listType === 'bulletList'
        if (type === 'orderedList') return stateRef.current.listType === 'orderedList'
        return false
      },
      getJSON: () => buildDoc(stateRef.current),
      commands: {
        clearContent: () => {
          stateRef.current = { text: '', marks: new Set(), headingLevel: null, listType: null }
          forceRender((n) => n + 1)
        },
      },
      // Test-only hook: simulates typing into the contentEditable area.
      __setText: (text: string) => {
        stateRef.current.text = text
        emitUpdate()
      },
    }
    Object.defineProperty(api, 'isEmpty', { get: () => !stateRef.current.text })
    return api
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return editor
}

export function EditorContent({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  if (!editor) return null
  const e = editor as ReturnType<typeof useEditor> & { __setText: (text: string) => void }
  return (
    <div
      data-testid="tiptap-content"
      contentEditable
      suppressContentEditableWarning
      onInput={(event) => e.__setText(event.currentTarget.textContent ?? '')}
    />
  )
}
