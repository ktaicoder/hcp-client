import { HcpClient } from '@ktaicoder/hcp-client'
import { filter, map } from 'rxjs'

type HwControlRequest = {
  hwCmd: string
  args?: any[]
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

/**
 * test for digitalWrite
 */
async function execCmd(client: HcpClient, request: HwControlRequest) {
  const response = await client.requestHwControl(request)

  console.log('response headers: ', response.headers)
  console.log('response body: ', response.bodyAsJson())
}

/**
 * test for digitalWrite
 */
async function testDigitalWrite(client: HcpClient) {
  // const response = await client.requestHwControl('firmata.analogRead', 1)
  const response = await client.requestHwControl({
    hwCmd: 'firmata.setPinMode',
    args: [5, 'PWM'],
  })

  console.log('response headers: ', response.headers)
  console.log('response body: ', response.bodyAsJson())
}

async function batchRun(client: HcpClient) {
  async function execCmd(request: HwControlRequest) {
    const response = await client.requestHwControl(request)
    console.log('response headers: ', response.headers)
    console.log('response body: ', response.bodyAsJson())
  }
  const requests = [
    {
      hwCmd: 'firmata.setSamplingInterval',
      args: [200],
    },
    {
      hwCmd: 'firmata.setPinMode',
      args: [5, 'PWM'],
    },
    {
      hwCmd: 'firmata.setPinMode',
      args: ['A0', 'ANALOG'],
    },
    {
      hwCmd: 'firmata.digitalWrite',
      args: [12, 1],
    },
    // {
    //   hwCmd: 'firmata.analogWrite',
    //   args: ['A0', 44],
    // },
    {
      hwCmd: 'firmata.analogRead',
      args: ['A0'],
    },
    // {
    //   hwCmd: 'firmata.observeDigitalPinValue',
    //   args: [13],
    // },
    {
      hwCmd: 'firmata.observeAnalogPinValue',
      args: ['A0'],
    },
    {
      hwCmd: 'firmata.addPeripheral',
      args: ['button', 12],
    },
    {
      hwCmd: 'firmata.addPeripheral',
      args: ['led', 13],
    },
    {
      hwCmd: 'firmata.addPeripheral',
      args: ['piezo', 3],
    },
    {
      hwCmd: 'firmata.callPeripheral',
      args: [
        'piezo:3',
        false,
        'play',
        {
          type: 'raw',
          value: {
            song: 'C D F D A - A A A A G G G G - - C D F D G - G G G G F F F F - -',
            beats: 1 / 4,
            tempo: 100,
          },
        },
      ],
    },
    // {
    //   hwCmd: 'firmata.callPeripheral',
    //   args: [
    //     'piezo:5',
    //     false,
    //     'frequency',
    //     {
    //       type: 'raw',
    //       value: 698,
    //     },
    //     {
    //       type: 'raw',
    //       value: 2000,
    //     },
    //   ],
    // },
    // {
    //   hwCmd: 'firmata.addPeripheral',
    //   args: ['pin', 5],
    // },
    // {
    //   hwCmd: 'firmata.setPinMode',
    //   args: [5, 'PWM'],
    // },
    // {
    //   hwCmd: 'firmata.callPeripheral',
    //   args: ['pin:5', false, 'write', [{ type: 'raw', value: 1 }]],
    // },
    {
      hwCmd: 'firmata.observePeripheralState',
      args: ['button:12'],
    },
    // {
    //   hwCmd: 'firmata.analogWrite',
    //   args: ['A0', 123],
    // },
  ]
  for (const request of requests) {
    await execCmd(request)
  }

  await new Promise((resolve) => setTimeout(resolve, 30_000))
  // console.log('response headers: ', response.headers)
  // console.log('response body: ', response.bodyAsJson())
}

async function run(client: HcpClient) {
  client
    .observeHwNotifications()
    .pipe(
      filter((it) => it.type === 'firmata-value'),
      map(
        (it) =>
          it as unknown as { kind: string; pin: string | number; value: any }
      )
    )
    .subscribe((payload) => {
      const { kind, pin, value } = payload
      if (kind === 'button' && (value === 'press' || value === 'release')) {
        client.requestHwControl({
          hwCmd: 'firmata.callPeripheral',
          args: ['led:13', false, value === 'press' ? 'on' : 'off'],
        })
      }
      console.log(payload)
    })
  await batchRun(client)
}

export async function sampleFirmata() {
  const client = new HcpClient('ws://127.0.0.1:13997')
  try {
    client.connect()

    console.log('wait for connected')
    await client.waitForConnected()

    console.log('connected')
    await run(client)
  } catch (err: any) {
    console.log(err.message)
  } finally {
    client.close()
  }
}
