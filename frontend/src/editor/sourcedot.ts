import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * Blue-dot provenance marker left at the end of an accepted sourced suggestion.
 * Carries data-source / data-card so a click resolves "where it's from".
 */
export const SourceDot = Mark.create({
  name: 'sourceDot',
  inclusive: false,
  spanning: false,

  addAttributes() {
    return {
      source: { default: null },
      card: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span.src-dot' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'src-dot' }), '●']
  },
})
