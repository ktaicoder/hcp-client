import {
  Observable,
  Subscription,
  filter,
  firstValueFrom,
  take,
  timeout,
} from 'rxjs'
import { HcpClientSocket } from './HcpClientSocket'
import { HcpPacketHelper } from './HcpPacketHelper'
import { HcpConnectionState, HcpPacket } from './types'
import EventEmitter from 'events'

function nextRequestId() {
  return Math.random().toString(36).substring(2) + Date.now()
}

const REQUEST_TIMEOUT = 7000

export class HcpClient {
  private readonly eventEmitter: EventEmitter
  private readonly sock_: HcpClientSocket

  DEBUG = false

  private subscription_?: Subscription = undefined

  constructor(
    websocketUrl: string,
    public clientType: 'blockcoding' | 'normal' = 'normal'
  ) {
    this.sock_ = new HcpClientSocket(websocketUrl)
    this.eventEmitter = new EventEmitter()
  }

  observeConnectionState = (): Observable<HcpConnectionState> => {
    return this.sock_.observeConnectionState()
  }

  isConnected = (): boolean => this.sock_.isConnected()

  waitForConnected = async (): Promise<void> => {
    await firstValueFrom(
      this.observeConnectionState() //
        .pipe(
          filter((it) => it === 'CONNECTED'),
          take(1)
        )
    )
  }

  connect = (cancel$?: Observable<any>) => {
    if (this.sock_.isConnected()) {
      throw new Error('client already started')
    }
    const s = this.sock_
    this.subscription_ = new Subscription()
    this.subscription_.add(
      s.observeConnectionState().subscribe(this.debugConnectionState_)
    )
    this.subscription_.add(
      s.observeHcpMessage().subscribe(this.debugHcpPacket_)
    )
    if (cancel$) {
      this.subscription_.add(cancel$.pipe(take(1)).subscribe(this.close))
    }
    s.start()
  }

  private debugConnectionState_ = (status: HcpConnectionState) => {
    if (this.DEBUG) console.log('HcpClient.debugConnectionStatus_() ' + status)
  }

  private debugHcpPacket_ = (msg: HcpPacket) => {
    if (this.DEBUG)
      console.log(
        'HcpClient.debugHcpPacket_() ' + msg.channelId() + ',' + msg.proc()
      )
  }

  requestHwControl = async (
    hwCommand: string | { hwCmd: string; args?: any[] },
    ...args: unknown[]
  ): Promise<HcpPacket> => {
    const requestId = nextRequestId()
    let hwId: string | undefined
    let cmd: string | undefined
    let cmdArgs: unknown[] = args
    if (typeof hwCommand === 'string') {
      const arr = hwCommand.split('.')
      hwId = arr[0]
      cmd = arr[1]
    } else if (typeof hwCommand === 'object') {
      const arr = hwCommand.hwCmd.split('.')
      hwId = arr[0]
      cmd = arr[1]
      cmdArgs = hwCommand.args ?? []
    }

    if (!hwId || !cmd) {
      throw new Error('unknown')
    }
    // create packet
    const packet = HcpPacketHelper.createJsonPacket('hw,control', {
      header: {
        hwId,
        requestId,
      },
      body: {
        hwId,
        cmd,
        args: cmdArgs,
      },
    })

    // send packet
    this.sock_.send(packet)

    // wait for response
    return firstValueFrom(
      this.sock_
        .observeResponseByRequestId(requestId) //
        .pipe(timeout({ first: REQUEST_TIMEOUT }))
    )
  }

  requestMetaCmd = async (
    cmd: string,
    ...args: unknown[]
  ): Promise<HcpPacket> => {
    const requestId = nextRequestId()

    const packet = HcpPacketHelper.createJsonPacket('meta,cmd', {
      header: {
        requestId,
      },
      body: {
        cmd,
        args,
      },
    })

    // send packet
    this.sock_.send(packet)

    // wait for response
    return firstValueFrom(
      this.sock_
        .observeResponseByRequestId(requestId) //
        .pipe(timeout({ first: REQUEST_TIMEOUT }))
    )
  }

  observeHwNotifications = (): Observable<{ type: string }> => {
    return this.sock_.observeNotifications('hw')
  }

  close = () => {
    if (this.DEBUG) console.log('HcpClient.close()')
    this.sock_.stop()
    this.subscription_?.unsubscribe()
    this.subscription_ = undefined
  }
}
