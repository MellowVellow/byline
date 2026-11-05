import ConnectPanel, { type ConnectPanelProps } from './ConnectPanel'

export type ConnectPanelContainerProps = ConnectPanelProps

export default function ConnectPanelContainer(props: ConnectPanelProps) {
  return <ConnectPanel {...props} />
}
