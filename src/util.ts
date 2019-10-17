import { spawnSync } from 'child_process'
import packagejson from './package-json'

type VariantObj = { command: string; variant: 'podman' | 'docker' }
export const getVariant = (() => {
  let cache: VariantObj | null = null
  function canUse(ps: string) {
    const { status, stdout } = spawnSync(ps, ['-v'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    if (status !== 0) return false
    return stdout.toString() || true
  }
  function determine(): VariantObj {
    const docker = canUse('docker')
    if (docker)
      return {
        command: 'docker',
        variant:
          typeof docker === 'string' && docker.includes('podman')
            ? 'podman'
            : 'docker',
      }
    if (canUse('podman')) return { command: 'podman', variant: 'podman' }
    throw new Error('Found neither podman nor docker')
  }
  return (): VariantObj => {
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
