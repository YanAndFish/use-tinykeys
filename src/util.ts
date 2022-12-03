/**
 * 异步错误处理函数调用器
 * @param fn
 * @param args
 * @returns
 */
export function callWithAsyncErrorHandling(
  fn: Function | Function[],
  args?: unknown[]
): any[] {
  if (typeof fn === 'function') {
    const res = callWithErrorHandling(fn, args)
    if (res instanceof Promise) {
      res.catch((err) => {
        console.error(err)
      })
    }
    return res
  }

  const values = []
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], args))
  }
  return values
}

/**
 * 错误处理函数调用器
 * @param fn
 * @param args
 * @returns
 */
export function callWithErrorHandling(fn: Function, args?: unknown[]) {
  let res
  try {
    res = args ? fn(...args) : fn()
  } catch (err) {
    console.error(err)
  }
  return res
}
