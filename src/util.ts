import { spawnSync } from 'child_process'
import packagejson from './package-json'

export const getVariant = (() => {
  let cache = ''
  function canUse(ps: string) {
    const { status } = spawnSync(ps, ['-v'], {
      stdio: [null, 'pipe', 'inherit'],
    })
    if (status !== 0) return false
    return true
  }
  function determine() {
    if (canUse('docker')) return 'docker'
    if (canUse('podman')) return 'podman'
    throw new Error('Found neither podman nor docker')
  }
  return () => {
    if (cache) return cache
    cache = determine()
    return cache
  }
})()

export function getPrefix() {
  let { name } = packagejson()
  name = name.replace(/[^a-zA-Z0-9_.-]/g, '_')
  if (!/^[a-zA-Z0-9]/.test(name)) return 'a' + name
  return name
}
