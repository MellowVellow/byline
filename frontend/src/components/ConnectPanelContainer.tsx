import React from 'react'
import ConnectPanel, { type ConnectSession } from './ConnectPanel'

export interface ConnectPanelContainerProps {
  session: ConnectSession
  onToggleSeam: (id: string) => void
  onCycleAlt: (id: string, dir: 1 | -1) => void
  onCycleRelation: (id: string, dir: 1 | -1) => void
  focus?: { sentenceId: string; seamId?: string } | null
}

export default function ConnectPanelContainer(props: ConnectPanelContainerProps) {
  return <ConnectPanel {...props} />
}
