import { HcpClient } from '@ktaicoder/hcp-client'

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

/**
 * test for digitalRead
 */
async function testDigitalRead(client: HcpClient) {
  const pinNum = 1
  const response = await client.requestHwControl(
    'wiseXboard.digitalRead',
    pinNum
  )
  console.log('response headers: ', response.headers)
  console.log('response body: ', response.bodyAsJson())
}

/**
 * test for digitalWrite
 */
async function testDigitalWrite(client: HcpClient) {
  const pinNum = 1
  const pinValue = 1
  const response = await client.requestHwControl(
    'wiseXboard.digitalWrite',
    pinNum,
    pinValue
  )

  console.log('response headers: ', response.headers)
  console.log('response body: ', response.bodyAsJson())
}

async function run(client: HcpClient) {
  await testDigitalRead(client)
  await testDigitalWrite(client)
  await sleepMs(3000)
}

export async function sampleBasic() {
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
