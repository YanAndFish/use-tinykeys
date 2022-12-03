# use-tinykeys

Vue composition API for listen keyboard event.

## install

```bash
npm install @yafh/use-tinykeys
```

or usage `yarn`

```bash
yarn add @yafh/use-tinykeys
```

## usage

```ts
import { useTinykeys } from '@yafh/use-tinykeys'
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    // 监听单个键盘值
    const { enable } = useKeyStroke('Control+s', (event) => {
      console.log(event)
    })

    // 监听多个键盘值
    const { enable } = useKeyStroke(
      ['Control+s', 'Control+Shift+s'],
      (event) => {
        console.log(event)
      }
    )

    // 同时监听多个键盘事件
    const { enable } = useKeyStroke(
      'Control+s',
      (event) => {
        console.log(event)
      },
      {
        eventType: ['keydown', 'keyup'],
      }
    )

    // 分别监听多个键盘事件
    const { enable } = useKeyStroke('Control+s', {
      keydown: (event) => {
        console.log(event)
      },
      keyup: (event) => {
        console.log(event)
      },
    })

    // 针对不同平台监听不同键盘值
    const { enable } = useKeyStroke(
      {
        windows: 'Control+s',
        mac: ['Command+s', 'Command+Shift+s'],
      },
      (event) => {
        console.log(event)
      }
    )

    // 更换监听目标
    const { enable } = useKeyStroke(
      'Control+s',
      (event) => {
        console.log(event)
      },
      {
        target: document.body,
      }
    )
  },
})
```

## tips

按键 key 说明：

1.  'a' - 按下 a 键
2.  'Control+a' - 按下 ctrl+a 键
3.  'a b c d' - 依次按下 a、b、c、d 键

预设键值[点击查看](https://developer.mozilla.org/zh-CN/docs/Web/API/UI_Events/Keyboard_event_key_values#special_values)

## options

### target
需要监听的DOM元素
- type Window | HTMLElement
- default: window

### eventType
监听的事件类型
- type 'keydown' | 'keyup' or ('keydown' | 'keyup')[]
- default: 'keydown'

### timeout
连键超时时间(毫秒)
- type number
- default: 300

### listenOnkeepAlive
在组件不激活时是否仍然监听键盘事件
- type boolean