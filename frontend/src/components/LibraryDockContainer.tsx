import React from 'react'
import LibraryPanel, { type ClaimHit } from './LibraryPanel'
import type { CiteType, LibraryCard, LibrarySource } from '../domain/library'

export interface LibraryDockContainerProps {
  cards: LibraryCard[]
  sources: LibrarySource[]
  docText: string
  citeType: CiteType
  onCiteType: (t: CiteType) => void
  status: string
  url: string
  onUrl: (u: string) => void
  onAddLink: () => void
  onAddPdf: (f: File) => void
  adding: boolean
  cardCap: number
  onCardCap: (n: number) => void
  onCite: (card: LibraryCard) => void
  onShowSource: (card: LibraryCard) => void
  onDelete: (card: LibraryCard) => void
  onCheckClaims: () => void
  claimHits: ClaimHit[]
}

export default function LibraryDockContainer(props: LibraryDockContainerProps) {
  return <LibraryPanel {...props} />
}
