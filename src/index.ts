import { createKeybindingsHandler, KeyBindingMap } from 'tinykeys'
import {
  ComponentInternalInstance,
  getCurrentInstance,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  Ref,
  watchEffect,
} from 'vue'
import { isMac, isWindows } from './user-agent'
import { callWithAsyncErrorHandling } from './util'

/** 键盘事件监听器 */
export type KeyboardEventListener = (
  event: KeyboardEvent
) => void | ((event: KeyboardEvent) => Promise<void>)

/**
 * 内部使用的键盘事件处理器
 * @internal
 */
type IntervalKeyboardEventListener = KeyboardEventListener & {
  __wel?: KeyboardEventListener
}

type HasKeyboardFlagComponentInternalInstance = ComponentInternalInstance & {
  __utk_enabled?: Ref<boolean>
}

/**
 * 键盘事件监听目标
 */
export type KeyboardTarget = Window | HTMLElement

/**
 * 键盘事件类型
 */
export type KeyboardEventType =
  | 'keydown'
  | 'keyup'
  | /** @deprecated */ 'keypress'

/**
 * 键盘事件处理器对象
 */
export interface KeyboardEventListenerOption {
  keyup?: KeyboardEventListener
  keydown?: KeyboardEventListener
  /** @deprecated */
  keypress?: KeyboardEventListener
}

/**
 * 键盘事件选项
 */
export interface KeyStrokeOption {
  /**
   * 需要监听的DOM元素
   * @default window
   */
  target?: KeyboardTarget
  /**
   * 键盘事件类型
   * @default 'keydown'
   */
  eventType?: KeyboardEventType | KeyboardEventType[]
  /**
   * 连键超时时间(毫秒)
   * @default 300
   */
  timeout?: number
  /**
   * 在组件不激活时是否仍然监听键盘事件
   */
  listenOnkeepAlive?: boolean
  /**
   * 用户自定义的键盘事件控制值。如果传入该值，返回结果中的enable与这个值完全一致
   * - 组件切换激活状态时不会对该值进行修改
   */
  customEnable?: Ref<boolean>
}

/**
 * 键盘值可选平台
 */
export type KeyStrokePlatform = 'windows' | 'mac'

/**
 * 返回内容
 */
interface KeyStrokeResult {
  /** 当前按键事件控制值 */
  enable: Ref<boolean>
  /** 实例作用域按键事件控制值 */
  enableInstance: Ref<boolean>
  /** 注销键盘监听事件 */
  clearup: () => void
}

/**
 * 键盘事件组合式API
 * @param key 键盘值
 * @param handler 键盘事件处理器
 * @param option 键盘事件选项
 *
 * 按键key说明：
 * 1. 'a' - 按下a键
 * 2. 'Control+a' - 按下ctrl+a键
 * 3. 'a b c d' - 依次按下a、b、c、d键
 *
 * 预设键值[点击查看](https://developer.mozilla.org/zh-CN/docs/Web/API/UI_Events/Keyboard_event_key_values#special_values)
 *
 *
 * @example
 * ```ts
 * // 监听单个键盘值
 * const { enable } = useKeyStroke('Control+s', (event) => {
 *  console.log(event)
 * })
 *
 * // 监听多个键盘值
 * const { enable } = useKeyStroke(['Control+s', 'Control+Shift+s'], (event) => {
 *  console.log(event)
 * })
 *
 * // 同时监听多个键盘事件
 * const { enable } = useKeyStroke('Control+s', (event) => {
 *  console.log(event)
 * },{
 *   eventType: ['keydown', 'keyup']
 * })
 *
 * // 分别监听多个键盘事件
 * const { enable } = useKeyStroke('Control+s', {
 *   keydown: (event) => {
 *     console.log(event)
 *   },
 *   keyup: (event) => {
 *     console.log(event)
 *   }
 * })
 *
 * // 针对不同平台监听不同键盘值
 * const { enable } = useKeyStroke({
 *    windows: 'Control+s',
 *    mac: ['Command+s', 'Command+Shift+s']
 *  }, (event) => {
 *    console.log(event)
 *  })
 *
 * // 更换监听目标
 * const { enable } = useKeyStroke('Control+s', (event) => {
 *   console.log(event)
 * }, {
 *   target: document.body
 * })
 *
 * // 组件在销毁时会自动注销键盘监听事件，如果需要手动注销，可以调用clearup方法
 * const { enable, clearup } = useKeyStroke('Control+s', (event) => {
 *  console.log(event)
 * })
 *
 * clearup() // 手动注销
 *
 * // 传入一个已存在的响应式变量控制键盘监听事件
 * const customEnable = ref(true)
 * const { enable } = useKeyStroke('Control+s', (event) => {
 *   console.log(event)
 * }, {
 *   customEnable
 * })
 * enable === customEnable // true
 *
 *
 * ```
 *
 * @returns enable：当前按键事件控制值 enableInstance：实例作用域按键事件控制值
 */
export function useKeyStroke(
  key:
    | string
    | string[]
    | Partial<Record<KeyStrokePlatform, string | string[]>>,
  handler: KeyboardEventListener | KeyboardEventListenerOption,
  option: KeyStrokeOption = { target: window, eventType: 'keydown' }
): KeyStrokeResult {
  const instance = getCurrentInstance() as
    | HasKeyboardFlagComponentInternalInstance
    | undefined

  if (!instance) {
    throw new Error('onKeyStroke must be called inside a setup function')
  }

  if (!instance.__utk_enabled) {
    instance.__utk_enabled = ref(true)
  }

  let enable: Ref<boolean> & { __is_sustom_enabled?: boolean }
  if (option.customEnable) {
    enable = option.customEnable
    enable.__is_sustom_enabled = true
  } else {
    enable = ref(true)
  }

  const enableActivated = ref(true)
  const enableInstance = instance.__utk_enabled

  const { target, eventType, timeout, listenOnkeepAlive } = option

  const _key = filterKeyBinding(key)
  const _eventType = eventType
    ? Array.isArray(eventType)
      ? eventType
      : [eventType]
    : ['keydown']
  const _target = target || window

  let keyupListener: EventListener | undefined
  let keydownListener: EventListener | undefined
  let keypressListener: EventListener | undefined

  function registerEvent() {
    if (!_target) return
    keyupListener && _target.addEventListener('keyup', keyupListener)
    keydownListener && _target.addEventListener('keydown', keydownListener)
    keypressListener && _target.addEventListener('keypress', keypressListener)
  }

  function unregisterEvent() {
    if (!_target) return
    keyupListener && _target.removeEventListener('keyup', keyupListener)
    keydownListener && _target.removeEventListener('keydown', keydownListener)
    keypressListener &&
      _target.removeEventListener('keypress', keypressListener)
  }

  onBeforeUnmount(() => {
    unregisterEvent()
  })

  if (!listenOnkeepAlive) {
    onActivated(() => {
      enableActivated.value = true
      if (!enable.__is_sustom_enabled) {
        enable.value = true
      }
    })
    onDeactivated(() => {
      enableActivated.value = false
      if (!enable.__is_sustom_enabled) {
        enable.value = false
      }
    })
  }

  const stopWatchHandle = watchEffect(() => {
    // 执行操作前先删除旧事件
    unregisterEvent()
    // 不使用直接退出
    if (!enableInstance.value || !enable.value || !enableActivated.value) return

    if (typeof handler === 'function') {
      // 处理器为函数，option中的eventType有效
      const keyBindingHandler = wrapKeyBindingHandler(handler, _key, timeout)

      if (_eventType.includes('keydown')) {
        keydownListener = keyBindingHandler
      }
      if (_eventType.includes('keyup')) {
        keyupListener = keyBindingHandler
      }
      if (_eventType.includes('keypress')) {
        keypressListener = keyBindingHandler
      }
    } else {
      // 处理器为对象，option中的eventType无效
      if (handler.keydown) {
        keydownListener = wrapKeyBindingHandler(handler.keydown, _key, timeout)
      }
      if (handler.keyup) {
        keyupListener = wrapKeyBindingHandler(handler.keyup, _key, timeout)
      }
      if (handler.keypress) {
        keypressListener = wrapKeyBindingHandler(
          handler.keypress,
          _key,
          timeout
        )
      }
    }
    registerEvent()
  })

  const clearup = () => {
    stopWatchHandle()
    unregisterEvent()
  }

  return {
    enable,
    enableInstance,
    clearup,
  }
}

/**
 * 过滤并格式化键盘值
 * @param key 键盘值
 * @returns
 */
function filterKeyBinding(
  key: string | string[] | Partial<Record<KeyStrokePlatform, string | string[]>>
): string[] {
  if (typeof key === 'string') {
    return [key]
  } else if (Array.isArray(key)) {
    return key
  } else if (isWindows()) {
    return Array.isArray(key.windows)
      ? key.windows
      : key.windows
      ? [key.windows]
      : []
  } else if (isMac()) {
    return Array.isArray(key.mac) ? key.mac : key.mac ? [key.mac] : []
  } else {
    return []
  }
}

/**
 * 包装键盘事件处理器，使其能进行错误处理
 * @param fn
 * @returns
 */
function wrapEventListener(fn: IntervalKeyboardEventListener) {
  if (!fn.__wel) {
    fn.__wel = (event: KeyboardEvent) => {
      callWithAsyncErrorHandling(fn, [event])
    }
  }
  return fn.__wel
}

/**
 * 包装键盘事件处理器，与keybinding进行匹配
 * @param handler 键盘事件处理器
 * @param key 键盘按键
 * @param timeout 连键超时时间
 * @returns
 */
export function wrapKeyBindingHandler(
  handler: KeyboardEventListener,
  key: string[],
  timeout?: number
) {
  const _handler = wrapEventListener(handler)

  return createKeybindingsHandler(
    key.reduce((acc, type) => {
      acc[type] = _handler
      return acc
    }, {} as KeyBindingMap),
    { timeout }
  )
}
