const { logError } = require('./docker-prepare')
const { spawnSync } = require('child_process')
const tmux = require('./package-json')['tmux']
const { checkLatest } = require('./check-is-latest')

const confName = process.argv[2]
const conf = tmux[confName]

function exit() {
  console.log('npm run tmux -- <configuration>')
  console.log(`Valid configurations: ${Object.keys(tmux).filter(c => !/^hooks?-/.exec(c)).join(', ')}`)
  process.exit(1)
}
if (!conf) {
  logError('Invalid configuration')
  exit()
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' })
  if(res.status !== 0) {
    console.error(cmd, 'exited with error code', res.status)
    process.exit(0)
  }
}


function tmuxPane(pane) {
  const args = []
  args.push('send-keys')
  if(pane.dir) {
    args.push('cd '+pane.dir, 'C-m')
  }
  args.push(pane.cmd, 'C-m', ';')

  if(pane.name) {
    args.push('rename-window', pane.name, ';')
  }
  return args
}

function toArray(el) {
  if(!el) return []
  return Array.isArray(el) ? el : [el]
}

function runTmuxWithPanes(config) {
  if(Array.isArray(config)) {
    logError('💥 [breaking-change] Config must not be array. It must be object with panes key')
  }
  let args = process.env.TMUX ? [] : ['new-session', ';']
  let first = true
  for(const pane of config.panes) {
    if(first) first = false
    else args.push('new-window', ';')
    args = args.concat(tmuxPane(pane))
  }
  let hooksBA = [tmux['hook-before-all']].concat(tmux['hooks-before-all']).concat(config['before-all'])
  for(let hookBA of hooksBA) {
    if(hookBA) {
      if(typeof hookBA === 'string') hookBA = hookBA.split(' ')
      run(hookBA[0], hookBA.slice(1), { stdio: 'inherit' })
    }
  }
  run('tmux', args, { stdio: 'inherit' })
  checkLatest()
  console.log('bye 👋 😸')
}

module.exports = () => runTmuxWithPanes(conf)
