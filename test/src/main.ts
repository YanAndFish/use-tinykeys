import { createApp, defineComponent, h } from 'vue'
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
      ]),
      h('div', []),
    ]
  },
})

const app = createApp(App)

app.mount('#app')
