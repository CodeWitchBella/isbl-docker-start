/* eslint-disable import/no-commonjs, no-console */
import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import packagejson from './package-json'

const colorReset = '\x1b[0m'
const colorFgRed = '\x1b[31m'
export function logError(...args: any[]) {
  process.stderr.write(colorFgRed)
  console.error(...args)
  process.stderr.write(colorReset)
}

export function prepare() {
  const prefix = packagejson.name
  const nodeVersion = packagejson().nodeVersion || '10'

  const image = `node:${nodeVersion}-alpine`
  const packages = (packagejson().packages || []).join(' ')

  const dockerContext = path.join(__dirname, '../docker')
  const dockerfilePath = path.join(dockerContext, 'Dockerfile')

  function readTemplate() {
    return fs.readFileSync(`${dockerfilePath}.template`, 'utf-8')
  }

  function shouldRebuild(template: string) {
    console.log('Checking dev image version')
    const { status, stdout, error } = spawnSync(
      'docker',
      ['inspect', `${prefix}-devel`],
      { stdio: [null, 'pipe', 'inherit'] },
    )
    if (error) logError(error)
    if (status !== 0) return true

    const out = JSON.parse(stdout.toString('utf8'))
    if (out.length < 1) return true
    const config = out[0].Config || out[0].ContainerConfig
    const nodev = config.Env.find((el: string) =>
      /^NODE_VERSION=/.exec(el),
    ).replace('NODE_VERSION=', '')
    const labels = config.Labels
    if (!labels) return true

    const version = /LABEL version=([0-9]+)\n/g.exec(template)
    if (version == null) return true
    const requiredv = version[1]
    return (
      requiredv !== labels.version ||
      nodev !== nodeVersion ||
      packages !== labels.packages
    )
  }

  function writeDockerfile(template: string) {
    fs.writeFileSync(
      dockerfilePath,
      template.replace(/{{image}}/g, image).replace(/{{packages}}/g, packages),
      'utf-8',
    )
  }

  function rebuild() {
    console.log('Rebuilding dev image')
    const { status, error } = spawnSync(
      'docker',
      `build --rm -f ${dockerfilePath} -t ${prefix}-devel ${dockerContext}`.split(
        ' ',
      ),
      { stdio: 'inherit' },
    )
    if (error) logError(error)
    else if (status !== 0)
      logError(new Error(`Process exitted with non-zero status code ${status}`))
  }

  function mkdir(dir: string) {
    try {
      fs.mkdirSync(path.join(process.cwd(), dir))
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
    }
  }

  if (console.time) console.time('time')
  const template = readTemplate()
  if (shouldRebuild(template)) {
    writeDockerfile(template)
    rebuild()
  }
  if (console.timeEnd) console.timeEnd('time')

  mkdir('frontend')
  mkdir('frontend/node_modules')
  mkdir('backend')
  mkdir('backend/node_modules')

  spawnSync('docker', `network create ${prefix}`.split(' '))
}

// eslint-disable-next-line global-require
if (require.main === module) {
  prepare()
}
