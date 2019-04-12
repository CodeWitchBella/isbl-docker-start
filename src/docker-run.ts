// this is only file that should work on all supported nodejs versions
/* eslint-disable import/no-commonjs, no-console */
import { spawn, spawnSync } from 'child_process'
import path from 'path'
import { logError, prepare } from './docker-prepare'
import packagejson from './package-json'

export const dockerRun = () => {
  const configurations = packagejson().configurations

  const confName = process.argv[2]
  const conf = configurations[confName]

  function exit() {
    console.log('npm run docker -- <configuration>')
    console.log(
      `Valid configurations: ${Object.keys(configurations).join(', ')}`,
    )
    process.exit(1)
  }

  function checkIsPodMan() {
    const { status, stdout, error } = spawnSync('docker', ['-v'], {
      stdio: [null, 'pipe', 'inherit'],
    })
    if (error) throw error
    if (status !== 0) throw new Error('docker -v status code is not 0')
    return /podman/.exec(stdout.toString())
  }

  if (!conf) {
    logError('Invalid configuration')
    exit()
  }
  const isPodMan = checkIsPodMan()
  let prefix = packagejson().name
  if (isPodMan) {
    prefix = path.join(process.cwd(), prefix)
  }
  console.log({ prefix, isPodMan })

  prepare()

  let cwd = process.env.HOST_PATH || process.cwd()
  cwd =
    path.sep === '\\'
      ? cwd.replace(/^([^:]+):/, '\\$1').replace(/\\/g, '/')
      : cwd

  const virtdir = '/app'

  const { volume = [], chownDir = [] } = (() => {
    if (!conf.volume) return {}
    let dir = conf.volume
    let name = confName
    if (conf.volume.includes(':')) {
      ;[name, dir] = conf.volume.split(':')
    }
    if (!dir.startsWith('/')) {
      dir = path.join(virtdir, dir)
    }
    return {
      volume: [`-v=${prefix}-${name}:${dir}:rw,Z`],
      chownDir: [dir],
    }
  })()

  function getPort() {
    if (!conf.port) return []
    if (typeof conf.port === 'string' && conf.port.includes(':')) {
      return [`-p=${conf.port}`]
    }
    return [`-p=${conf.port}:${conf.port}`]
  }

  const args = [
    'run',
    '-i',
    '--rm',
    `--network=${prefix}`,
    `--name=${prefix}-${confName}`,
    '--env=IN_DOCKER=true',
    `--env=HOST_PATH=${cwd}`,
  ]
    .concat(
      !conf.image
        ? [
            `-v=${prefix}-home:/home/:rw`,
            `-v=${cwd}:${virtdir}:z`,
            `-v=${prefix}-modules-fe:${virtdir}/frontend/node_modules:rw`,
            `-v=${prefix}-modules-be:${virtdir}/backend/node_modules:rw`,
            `-w=${conf.dir ? path.join(virtdir, conf.dir) : virtdir}`,
          ]
        : [],
    )
    .concat(conf.args || [])
    .concat(getPort())
    .concat(
      conf.env
        ? Object.entries(conf.env)
            .map(([k, v]) => ['--env', `${k}=${v}`])
            .reduce((a, b) => a.concat(b), [])
        : [],
    )
    .concat(volume)
    .concat(process.getuid ? [`--user=${process.getuid()}`] : [])
    .concat(process.env.SITE ? ['--env', `SITE=${process.env.SITE}`] : [])
    // pass -t if term is tty
    .concat(process.stdout.isTTY ? ['-t'] : [])
    .concat(
      process.platform === 'win32' ? ['--env=DOCKER_ON_WINDOWS=true'] : [],
    )
    .concat(['-v', '/var/run/docker.sock:/var/run/docker.sock'])
    .concat(conf.image ? [conf.image] : [`${prefix}-devel`])
    .concat(
      typeof conf.cmd === 'string'
        ? conf.cmd.split(' ')
        : Array.isArray(conf.cmd)
        ? conf.cmd
        : [],
    )
    .concat(process.argv.slice(3) || [])
  console.log(args)

  if (conf.image) {
    spawnSync('docker', ['pull', conf.image], { stdio: 'inherit' })
  }

  const child = spawn('docker', args, { stdio: 'inherit' })
  child.on('error', err => {
    logError(err)
    process.exit(255)
  })
  child.on('exit', () => {
    process.exit(0)
  })
}
