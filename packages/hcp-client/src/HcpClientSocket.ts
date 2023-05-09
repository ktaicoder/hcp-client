import { Buffer } from 'node:buffer'
import { TextEncoder } from 'node:util'
import { BehaviorSubject, filter, Observable, Subject, Subscription, takeUntil } from 'rxjs'
import WebSocket from 'ws'
import { HcpPacketHelper } from './HcpPacketHelper'
import { HcpConnectionState, HcpPacket } from './types'

const DEBUG = false

export class HcpClientSocket {
  private webSocket_?: WebSocket

  private subscription_?: Subscription

  private connectionState$ = new BehaviorSubject<HcpConnectionState>('DISCONNECTED')

  private destroyTrigger$ = new Subject<any>()

  private message$ = new Subject<HcpPacket>()

  private textEncoder_?: TextEncoder

  constructor(private address: string | URL) {}

  isConnected = (): boolean => this.connectionState$.value === 'CONNECTED'

  observeConnectionState = (): Observable<HcpConnectionState> => {
    return this.connectionState$.asObservable()
  }

  observeHcpMessage = (): Observable<HcpPacket> => {
    return this.message$.asObservable()
  }

  start = () => {
    if (this.webSocket_) {
      throw new Error('client already started')
    }
    const s = new WebSocket(this.address)
    s.binaryType = 'arraybuffer'
    s.addEventListener('open', this.onOpen_)
    s.addEventListener('message', this.onMessage_)
    s.addEventListener('close', this.onClose_)
    s.addEventListener('error', this.onError_)

    this.webSocket_ = s
    this.connectionState$.next('CONNECTING')
    this.subscription_ = this.message$.asObservable().subscribe(this.onReceiveHcpMessage_)
  }

  private onOpen_ = (_event: WebSocket.Event) => {
    this.connectionState$.next('PREPARING')
    this.send(HcpPacketHelper.createHelloPacket())
  }

  private onMessage_ = (event: WebSocket.MessageEvent) => {
    const { data } = event
    const msg = HcpPacketHelper.parseBuffer(Buffer.from(data as ArrayBuffer))
    if (msg) {
      if (DEBUG) console.log('onMessage_', msg.toString())
      this.message$.next(msg)
    }
  }

  private onError_ = (event: WebSocket.ErrorEvent) => {
    if (DEBUG) console.log('onError_', event)
  }

  private onClose_ = (reason: WebSocket.CloseEvent) => {
    if (DEBUG) console.log('onClose_', reason)
    this.stop()
  }

  private onReceiveHcpMessage_ = (msg: HcpPacket) => {
    const channelId = msg.channelId()
    const channelMsg = msg.proc()
    if (channelId === 'meta' && channelMsg === 'welcome') {
      if (this.connectionState$.value === 'PREPARING') {
        this.connectionState$.next('CONNECTED')
      } else {
        console.warn('connection status invalid:' + this.connectionState$.value)
      }
    }
  }

  private observeMsg_ = (): Observable<HcpPacket> => {
    return this.message$.pipe(takeUntil(this.destroyTrigger$))
  }

  private encode_ = (text: string): Uint8Array => {
    if (!this.textEncoder_) {
      this.textEncoder_ = new TextEncoder()
    }
    return this.textEncoder_.encode(text)
  }

  observeResponseByChannelMsg = (channelId: string, channelMsg: string): Observable<HcpPacket> => {
    return this.observeMsg_().pipe(
      filter((msg) => msg.channelId() === channelId && msg.proc() === channelMsg),
    )
  }

  observeResponseByChannel = (channel: string): Observable<HcpPacket> => {
    return this.observeMsg_().pipe(filter((msg) => msg.channelId() === channel))
  }

  observeResponseByRequestId = (requestId: string): Observable<HcpPacket> => {
    return this.observeMsg_().pipe(filter((msg) => msg.requestId() === requestId))
  }

  send = (data: string | Buffer) => {
    const s = this.webSocket_
    if (!s) {
      if (DEBUG) console.warn('send() fail, socket closed')
      return
    }
    if (typeof data === 'string') {
      s.send(this.encode_(data))
    } else {
      s.send(data)
    }
  }

  stop = () => {
    if (DEBUG) console.log('HcpClientSocket.stop()')
    this.destroyTrigger$.next(1) // emit any value

    if (this.connectionState$.value !== 'DISCONNECTED') {
      this.connectionState$.next('DISCONNECTED')
    }

    if (this.subscription_) {
      this.subscription_.unsubscribe()
      this.subscription_ = undefined
    }

    const s = this.webSocket_
    if (s) {
      s.removeEventListener('open', this.onOpen_)
      s.removeEventListener('message', this.onMessage_)
      s.removeEventListener('close', this.onClose_)
      s.removeEventListener('error', this.onError_)
      s.close()
      this.webSocket_ = undefined
    }
  }
}
