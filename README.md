# HCP CLIENT

- `HCP`는 Hardware Control Protocol을 의미합니다. HCP는 웹소켓을 전송 레이어로 이용합니다.

- 이 프로젝트에는 아래의 소스코드가 포함되어 있습니다.

  - `packages/hcp-client` : HCP 통신 라이브러리(client side)
  - `apps/example` : `hcp-client`을 이용하는 예제 프로그램

- AI 코디니 PC 프로그램은 HCP 서버로써 동작합니다.
  - 그러므로, PC 프로그램을 실행한 후에, `apps/example/`의 예제 프로그램을 실행하면 PC 프로그램과 통신을 합니다.

## Quick start

```bash
# install dependencies
pnpm install

# start example program
pnpm dev
```

## 예제

### 연결 및 끊기

```js
const client = new HcpClient('ws://127.0.0.1:13997', 'normal')
client.connect() // 연결하기
client.disconnect() // 연결 끊기
```

연결을 종료할 때는 close()를 호출해야 합니다.

### 연결 상태 모니터링

간단한 테스트를 하는 경우라면 보통 다음과 같이 사용합니다.

```js
client.connect() // 연결하기

// 연결될때까지 기다리기
await client.waitForConnected()

// 실제 데이터 전송
// client.requestHwControl(...)
```

`rxjs` 의 옵저버블이 필요하다면 다음과 같이 할 수 있습니다.

```js
client.connect() // 연결하기

// 모니터링
client.observeConnectionState().subscript((connected) => {
  if (connected === 'CONNECTING') {
    console.log('connecting...')
  } else if (connected === 'PREPARING') {
    console.log('handshaking...')
  } else if (connected === 'CONNECTED') {
    console.log('연결되었습니다')
  } else {
    console.log('연결되지 않았습니다')
  }
})
```

### 하드웨어에 제어 명령 보내기

- 하드웨어에 제어 명령을 보낼 때는 `requestHwControl()`을 호출합니다.
- `requestHwControl()` 함수의 파라미터는

  - 첫번째 파라미터 hwCmd는 제어명령입니다. 하드웨어ID와 명령어 가 조합된 형태입니다. (`{hwId}.{cmd}`). PC 프로그램은 cmd별로 하나의 함수를 만듭니다. 따라서 PC 프로그램에 있는 함수를 호출하는 것과 마찬가지입니다.
  - 두번째 파라미터부터는 첫번째 파라미터인 제어명령에 따라 달라집니다. 없을 수도 있고, 여러개 존재할 수도 있습니다.

- 아래의 예는 `arduino` 하드웨어의 13번 핀에 1을 쓰는 `digitalWrite` 명령을 보내는 예시입니다.

```js
const response = await client.requestHwControl(
  'arduino.digitalWrite', // hardware cmd
  13, // pin number argument
  1 // pin value argument
)
```

### 하드웨어로 부터 값을 읽기

- 값을 읽을 때도 `requestHwControl()` 함수를 이용합니다. `read()` 같은 함수는 없습니다. 예를 들면, 5번 핀을 읽겠다는 `요청을 전송`하므로, `requestHwControl()` 함수를 이용하는 것입니다.

```js
const response = await client.requestHwControl(
  'arduino.digitalRead', // hardware cmd
  5 // pin number argument
)
```

## 전체 예제

전체 예제는 `apps/example` 폴더에 있습니다. 다음과 같이 실행합니다.

```bash
# install dependencies
pnpm install

# start example program
pnpm dev
```

- 아래는 `wiseXboard` 하드웨어에 digitalRead/Write 명령을 전송하는 예제입니다.

```js
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
  console.log('result data: ' + response)
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
  console.log('result data: ' + response)
}

async function run(client: HcpClient) {
  await testDigitalRead(client)
  await testDigitalWrite(client)
  await sleepMs(3000)
}

async function main() {
  // pc program listen port: 13997
  const client = new HcpClient('ws://127.0.0.1:13997', 'normal')
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

main()

```
