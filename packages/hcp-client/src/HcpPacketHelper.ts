import { HcpPacket } from './types'
import { Buffer } from 'node:buffer'

const LF = 10
const textDecoder = new TextDecoder('utf-8')

function buf2str(buffer: Buffer): string {
  return textDecoder.decode(buffer)
}

function toJsonStr(s: unknown | null | undefined): string {
  if (typeof s === 'undefined' || s === null) return ''
  return JSON.stringify(s)
}

function toTextStr(s: string | null | undefined): string {
  if (typeof s === 'undefined' || s === null) return ''
  return s
}

function trimStr(s: string | null | undefined): string {
  if (!s) return ''
  return s.trim()
}

function parseChannel(
  channel: string | null | undefined
): { channelId: string; proc: string } | undefined {
  if (!channel) return undefined
  let [channelId, proc] = channel.split(',', 2)
  channelId = trimStr(channelId)
  proc = trimStr(proc)
  if (channelId.length === 0 || proc.length === 0) {
    return undefined
  }

  return { channelId, proc }
}

export class HcpPacketHelper {
  /**
   * 데이터 버퍼를 문자열로 디코딩한다
   * @param buffer 데이터 버퍼
   * @returns
   */
  static decodeBufferToText(buffer: Buffer): string {
    return textDecoder.decode(buffer)
  }

  /**
   * 데이터 버퍼를 JSON으로 디코딩한다.
   * @param buffer 데이터 버퍼
   * @returns
   */
  static decodeBufferToJson(buffer: Buffer): any {
    const text = textDecoder.decode(buffer)
    return JSON.parse(text)
  }

  /**
   * 헤더를 만든다
   */
  static mergeHeader(
    channel: string,
    contentType: string,
    extraHeaders: Record<string, string> | null | undefined
  ): string {
    const headers = {
      channel,
      contentType,
      ...extraHeaders,
    }

    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
  }

  /**
   * JSON 패킷을 만든다.
   * @param channel 채널
   * @param data 데이터
   * @returns JSON 패킷 문자열
   */
  static createJsonPacket(
    channel: string,
    data?: {
      header?: Record<string, string> | null
      body?: unknown | null
    }
  ): string {
    return `${HcpPacketHelper.mergeHeader(
      channel,
      'json',
      data?.header
    )}\n\n${toJsonStr(data?.body)}`
  }

  /**
   * 텍스트 패킷을 만든다.
   * @param channel 채널
   * @param data 데이터
   * @returns 텍스트 패킷 문자열
   */
  static createTextPacket(
    channel: string,
    data?: {
      header?: Record<string, string> | null
      body?: string | null
    }
  ): string {
    return `${HcpPacketHelper.mergeHeader(
      channel,
      'text',
      data?.header
    )}\n\n${toTextStr(data?.body)}`
  }

  /**
   * 서버 Hello 패킷
   */
  static createHelloPacket(): string {
    return HcpPacketHelper.createTextPacket('meta,hello')
  }

  /**
   * 수신된 데이터를 파싱한다
   * @param buffer 수신된 데이터
   * @returns 패킷 객체를 리턴한다
   */
  static parseBuffer(buffer: Buffer): HcpPacket | null {
    let buf = buffer
    const lines = [] as string[]
    let i = -1
    while ((i = buf.indexOf(LF)) > 0) {
      lines.push(buf2str(buf.subarray(0, i)))
      buf = buf.subarray(i + 1)
    }

    if (i !== 0) {
      // throw new Error('unknown packet')
      console.log('ignore invalid packet:', buf2str(buffer))
      return null
    }
    buf = buf.subarray(1) // point body start position
    const headers: Record<string, string> = {}
    lines.forEach((line) => {
      const arr = line.split(':', 2)
      if (arr.length === 2) {
        headers[arr[0].trim()] = arr[1].trim()
      }
    })
    const channel = headers['channel']
    if (!channel || channel.length === 0) {
      console.log(
        'ignore invalid packet(channel is required):',
        buf2str(buffer)
      )
      return null
    }
    const { channelId, proc } = parseChannel(headers['channel']) ?? {}
    if (!channelId || !proc) {
      console.log('ignore invalid packet(invalid channel):', buf2str(buffer))
      return null
    }

    return new HcpPacket(
      channelId,
      proc,
      buf.length === 0 ? null : buf,
      headers
    )
  }
}
