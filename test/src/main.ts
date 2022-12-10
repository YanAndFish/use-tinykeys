import { createApp, defineComponent, h, ref } from 'vue'
import { useKeyStroke } from '../../dist/index'

const App = defineComponent({
  name: 'App',
  setup() {
    // 基本功能
    const { enable, enableInstance } = useKeyStroke('a', (e) => console.log(e))
    // 测试实例作用域
    const { enableInstance: enableInstance2 } = useKeyStroke('b', (e) =>
      console.log(e)
    )
    // 测试手动传入enable以及clearup
    const customEnable = ref(true)
    const { enable: enable3, clearup } = useKeyStroke(
      'c',
      (e) => console.log(e),
      {
        customEnable,
      }
    )

    console.log('customEnable === enable3', customEnable === enable3)

    return () => [
      h('div', [
        h(
          'button',
          {
            onClick: () => {
              enable.value = !enable.value
            },
            type: 'button',
          },
          h('span', String('控制a：' + enable.value))
        ),
        h(
          'button',
          {
            onClick: () => {
              enableInstance.value = !enableInstance.value
            },
            type: 'button',
          },
          h(
            'span',
            String(
              '控制实例：' +
                enableInstance.value +
                ' 2：' +
                enableInstance2.value
            )
          )
        ),
        h(
          'button',
          {
            onClick: () => {
              customEnable.value = !customEnable.value
            },
            type: 'button',
          },
          h('span', String('客户自定义状态：' + customEnable.value))
        ),
        h(
          'button',
          {
            onClick: () => {
              clearup()
            },
            type: 'button',
          },
          '清除'
        ),
      ]),
      h('div', []),
    ]
  },
})

const app = createApp(App)

app.mount('#app')
