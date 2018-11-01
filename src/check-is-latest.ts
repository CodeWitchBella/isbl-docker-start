/* eslint-disable import/no-commonjs, no-console */
import { spawnSync } from 'child_process'
import { logError } from './docker-prepare'
import packagejson from './package-json'

const nodeVersion = packagejson.nodeVersion || '10'

const image = `node:${nodeVersion.split('.')[0]}-alpine`

function pull() {
  console.log('Downloading latest docker image for node')
  const { status, stdout, error } = spawnSync('docker', ['pull', image], {
    stdio: [null, 'pipe', 'pipe'],
  })
  if (error) logError(error)
  return status !== 0
}

function getVersion() {
  console.log('Checking dev image version')
  const { status, stdout, error } = spawnSync('docker', ['inspect', image], {
    stdio: [null, 'pipe', 'inherit'],
  })
  if (error) logError(error)
  if (status !== 0) return null

  const out = JSON.parse(stdout.toString())
  if (out.length < 1) return null
  return out[0].Config.Env.find((el: string) =>
    /^NODE_VERSION=/.exec(el),
  ).replace('NODE_VERSION=', '')
}

export function checkLatest() {
  pull()
  const latest = getVersion()
  if (latest === null) return
  const series = nodeVersion.split('.')[0]
  if (latest !== nodeVersion) {
    logError(`Specified node version ${nodeVersion} is not latest!`)
    logError(`Latest version in ${series} series is ${latest}`)
  } else {
    process.stderr.write('\x1b[32m')
    console.log(`👍 You are on latest node version in ${series} series 🎉`)
    process.stderr.write('\x1b[0m')
  }
}

// eslint-disable-next-line global-require
if (require.main === module) {
  checkLatest()
}
