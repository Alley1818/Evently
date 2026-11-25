import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Annotation, Compartment, EditorState, Transaction } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useLayoutEffect, useRef } from 'react'

const externalChange = Annotation.define<boolean>()

const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--editor-key)' },
  { tag: tags.string, color: 'var(--editor-string)' },
  { tag: tags.number, color: 'var(--editor-number)' },
  { tag: [tags.bool, tags.null], color: 'var(--editor-literal)' },
  { tag: tags.punctuation, color: 'var(--muted)' },
])

function editorAttributes(errorId?: string) {
  return EditorView.contentAttributes.of({
    'aria-label': 'Event data (JSON)',
    'aria-invalid': errorId ? 'true' : 'false',
    ...(errorId ? { 'aria-describedby': errorId } : {}),
    spellcheck: 'false',
  })
}

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  errorId?: string
}

export function JsonEditor({ value, onChange, errorId }: JsonEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<EditorView>(null)
  const initialValue = useRef(value)
  const changeHandler = useRef(onChange)
  const attributes = useRef(new Compartment())

  useLayoutEffect(() => {
    changeHandler.current = onChange
  }, [onChange])

  useLayoutEffect(() => {
    if (!host.current) return

    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          json(),
          syntaxHighlighting(highlight),
          EditorView.lineWrapping,
          attributes.current.of(editorAttributes()),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((entry) => entry.annotation(externalChange))) {
              changeHandler.current(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    editor.current = view

    return () => {
      editor.current = null
      view.destroy()
    }
  }, [])

  useLayoutEffect(() => {
    const view = editor.current
    if (!view || view.state.doc.toString() === value) return

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: [externalChange.of(true), Transaction.userEvent.of('input')],
    })
  }, [value])

  useLayoutEffect(() => {
    editor.current?.dispatch({ effects: attributes.current.reconfigure(editorAttributes(errorId)) })
  }, [errorId])

  return <div ref={host} className="playground-editor" />
}
