import { UAParser } from 'ua-parser-js'

export const ua = new UAParser().getResult()

export function isWindows() {
  return ua.os.name === 'Windows'
}

export function isMac() {
  return ua.os.name === 'Mac OS' || ua.os.name === 'iOS'
}
