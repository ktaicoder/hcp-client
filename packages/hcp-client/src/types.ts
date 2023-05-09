import { TextDecoder } from 'util'

export type HcpConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'PREPARING' | 'CONNECTED'

let textDecoder: TextDecoder | undefined = undefined

function decode(data: Uint8Array): string {
  let decoder = textDecoder
  if (!decoder) {
    decoder = new TextDecoder('utf-8')
    textDecoder = decoder
  }
  return decoder.decode(data)
}

export class HcpPacket {
  private channelId_: string

  private proc_: string

  constructor(
    channelId: string,
    proc: string,
    public readonly body: Uint8Array | null | undefined,
    public readonly headers: Record<string, string>,
  ) {
    this.channelId_ = channelId
    this.proc_ = proc
  }

  channelId = (): string => {
    return this.channelId_
  }

  proc = (): string => {
    return this.proc_
  }

  contentType = (): string | null => {
    return this.headerOf('contentType')
  }

  requestId = (): string | null => {
    return this.headerOf('requestId')
  }

  hwId = (): string | null => {
    return this.headerOf('hwId')
  }

  bodyLength = (): number => {
    if (typeof this.body === 'undefined' || this.body === null) return 0
    return this.body.byteLength
  }

  headerOf = (headerKey: string): string | null => {
    const v = this.headers[headerKey]
    return v ? v.trim() : null
  }

  bodyAsJson = (): any | null => {
    if (!this.body || this.bodyLength() === 0) return null
    return JSON.parse(decode(this.body))
  }

  bodyAsText = (): string | null => {
    if (!this.body || this.bodyLength() === 0) return null
    return decode(this.body)
  }

  toString(): string {
    return (
      'HcpPacket:' +
      JSON.stringify({
        headers: this.headers,
        body: `${this.bodyLength()} bytes`,
      })
    )
  }
}
