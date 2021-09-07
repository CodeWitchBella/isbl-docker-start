// this is only file that should work on all supported nodejs versions
/* eslint-disable import/no-commonjs, no-console */
import { spawn, spawnSync } from 'child_process'
import path from 'path'
import { logError, prepare } from './docker-prepare'
import packagejson from './package-json'
import { getVariant, getPrefix } from './util'

export const dockerRun = () => {
  const { variant, command } = getVariant()
  const configurations = packagejson().configurations

  const confName = process.argv[2]
  const conf = configurations[confName || '']

  function exit() {
    console.log('npm run docker -- <configuration>')
    console.log(
      `Valid configurations: ${Object.keys(configurations).join(', ')}`,
    )
    process.exit(1)
  }

  if (!conf || typeof conf !== 'object') {
    logError('Invalid configuration')
    exit()
  }
  Object.assign(conf, configurations._default || {})
  let prefix = getPrefix()
  console.log({ prefix, variant })

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

  const passEnv: string[] = conf['pass-env'] || []
  if (!Array.isArray(passEnv) || passEnv.some((e) => typeof e !== 'string')) {
    logError('pass-env must be array of strings')
    process.exit(1)
  }

  const args = [
    'run',
    '-i',
    '--rm',
    variant === 'podman' ? '--network=host' : `--network=${prefix}`,
    `--name=${prefix}-${confName}`,
    variant === 'docker' ? '--env=IN_DOCKER=true' : '',
    `--env=HOST_PATH=${cwd}`,
  ]
    .concat(
      !conf.image
        ? [
            `-v=${prefix}-home:/home/:rw`,
            `-v=${cwd}:${virtdir}:z,rw`,
            ...(conf['mount-modules'] !== false
              ? [
                  `-v=${prefix}-modules-fe:${virtdir}/frontend/node_modules:rw`,
                  `-v=${prefix}-modules-be:${virtdir}/backend/node_modules:rw`,
                ]
              : []),
            `-w=${conf.dir ? path.join(virtdir, conf.dir) : virtdir}`,
          ]
        : [],
    )
    .concat(conf.args || [])
    .concat(getPort())
    .concat(
      conf.env
        ? Object.entries(conf.env).map(([k, v]) => `--env=${k}=${v}`)
        : [],
    )
    .concat(
      passEnv
        .map((k) => [k, process.env[k]])
        .filter(([_, v]) => !!v)
        .map(([k, v]) => `--env=${k}=${v}`),
    )
    .concat(volume)
    .concat(
      !process.getuid || conf.image || variant === 'podman'
        ? []
        : [`--user=${process.getuid()}`],
    )
    .concat(process.env.SITE ? ['--env', `SITE=${process.env.SITE}`] : [])
    // pass -t if term is tty
    .concat(process.stdout.isTTY ? ['-t'] : [])
    .concat(
      process.platform === 'win32' ? ['--env=DOCKER_ON_WINDOWS=true'] : [],
    )
    .concat(
      variant === 'docker'
        ? ['-v', '/var/run/docker.sock:/var/run/docker.sock']
        : [],
    )
    .concat(conf.image ? [conf.image] : [`${prefix}-devel`])
    .concat(
      typeof conf.cmd === 'string'
        ? conf.cmd.split(' ')
        : Array.isArray(conf.cmd)
        ? conf.cmd
        : [],
    )
    .concat(process.argv.slice(3) || [])
    .filter((a) => !!a)
  console.log(args)

  if (conf.image) {
    console.log('Pulling', conf.image)
    spawnSync(command, ['pull', conf.image], { stdio: 'inherit' })
  }

  const child = spawn(command, args, { stdio: 'inherit' })
  child.on('error', (err) => {
    logError(err)
    process.exit(255)
  })
  child.on('exit', () => {
    process.exit(0)
  })
}
