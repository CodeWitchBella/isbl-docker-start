// this is only file that should work on all supported nodejs versions
/* eslint-disable import/no-commonjs, no-console */
const { spawn, spawnSync } = require('child_process')
const tty = require('tty')
const path = require('path')
const { logError, prepare } = require('./docker-prepare')
const fs = require('fs')

const configurations = require('./package-json').configurations

const confName = process.argv[2]
const conf = configurations[confName]
const prefix = require('./package-json').name

function exit() {
  console.log('npm run docker -- <configuration>')
  console.log(`Valid configurations: ${Object.keys(configurations).join(', ')}`)
  process.exit(1)
}

module.exports = () => {
  if (!conf) {
    logError('Invalid configuration')
    exit()
  }

  prepare()

  let cwd = process.env.HOST_PATH || process.cwd()
  cwd = path.sep === '\\' ? cwd.replace(/^([^:]+):/, '\\$1').replace(/\\/g, '/') : cwd

  const virtdir = /\\/.exec(cwd) ? '/app' : cwd

  const { volume = [], chownDir = [] } = (() => {
    if(!conf.volume) return {}
    let dir = conf.volume
    let name = confName
    if(conf.volume.includes(":")) {
      [ name, dir ] = conf.volume.split(":")
    }
    if (!dir.startsWith("/")) {
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
  ].concat(
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
    .concat(process.getuid ? ['--env', `LOCAL_USER_ID=${process.getuid()}`] : [])
    .concat(process.env.SITE ? ['--env', `SITE=${process.env.SITE}`] : [])
    // pass -t if term is tty
    .concat(tty.isatty(process.stdout.fd) ? ['-t'] : [])
    .concat(process.platform === 'win32' ? ['--env=DOCKER_ON_WINDOWS=true'] : [])
    .concat(['-v', '/var/run/docker.sock:/var/run/docker.sock'])
    .concat(conf.image ? [ conf.image ] : [`${prefix}-devel`, virtdir, ...chownDir, '--'])
    .concat(typeof conf.cmd === 'string' ? conf.cmd.split(' ') : (Array.isArray(conf.cmd)? conf.cmd : []))
    .concat(process.argv.slice(3) || [])
  console.log(args)

  if(conf.image) {
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