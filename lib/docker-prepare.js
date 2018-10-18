/* eslint-disable import/no-commonjs, no-console */
const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const colorReset = '\x1b[0m'
const colorFgRed = '\x1b[31m'
function logError(...args) {
  process.stderr.write(colorFgRed)
  console.error(...args)
  process.stderr.write(colorReset)
}
module.exports.logError = logError

const prefix = require('./package-json').name
const nodeVersion = require('./package-json').nodeVersion || '10'
const image = `node:${nodeVersion}-alpine`
const packages = (require('./package-json').packages || []).join(' ')

const dockerContext = path.join(__dirname, '../docker')
const dockerfilePath = path.join(dockerContext, 'Dockerfile')

function readTemplate() {
  return fs.readFileSync(
    dockerfilePath+'.template',
    'utf-8',
  )
}

function shouldRebuild(template) {
  console.log('Checking dev image version')
  const { status, stdout, error } = spawnSync(
    'docker',
    ['inspect', `${prefix}-devel`],
    { stdio: [null, 'pipe', 'inherit'] },
  )
  if (error) logError(error)
  if (status !== 0) return true

  const out = JSON.parse(stdout)
  if (out.length < 1) return true
  const nodev = out[0].Config.Env
    .find(el => /^NODE_VERSION=/.exec(el))
    .replace('NODE_VERSION=','')
  const labels = out[0].Config.Labels
  if (!labels) return true
  
  const requiredv = /LABEL version=([0-9]+)\n/g.exec(template)[1]
  return requiredv !== labels.version || nodev !== nodeVersion || packages !== labels.packages
}

function writeDockerfile(template) {
  fs.writeFileSync(
    dockerfilePath,
    template.replace(/{{image}}/g, image).replace(/{{packages}}/g, packages),
    'utf-8')
  
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

function mkdir(dir) {
  try {
    fs.mkdirSync(path.join(process.cwd(), dir))
  } catch(e) {
    if(e.code !== 'EEXIST') throw e
  }
}

module.exports.prepare = function prepare() {
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

if (require.main === module) {
  module.exports.prepare()
}
