import { spawnSync } from 'child_process'
import which from 'which'
import { logError } from './docker-prepare'
import packagejson from './package-json'
import { checkLatest } from './check-is-latest'

export const inTmux = () => {
  const { tmux } = packagejson()
  const confName = process.argv[2]
  const conf = tmux[confName]

  function exit() {
    console.log('npm run tmux -- <configuration>')
    console.log(
      `Valid configurations: ${Object.keys(tmux)
        .filter(c => !/^hooks?-/.exec(c))
        .join(', ')}`,
    )
    process.exit(1)
  }
  if (!conf) {
    logError('Invalid configuration')
    exit()
  }

  function run(cmd: string, args: ReadonlyArray<string>) {
    const res = spawnSync(cmd, args, { stdio: 'inherit' })
    if (res.status !== 0) {
      console.error(cmd, 'exited with error code', res.status)
      process.exit(0)
    }
  }

  function alterCmd(cmd: string) {
    const parts = cmd.split(' ')
    const command = parts[0]
    let full = which.sync(command, { nothrow: true }) || command
    if (command === 'npm') {
      const node = which.sync('node', { nothrow: true })
      const execpath = process.env.npm_execpath
      full = node && execpath ? `${node} ${execpath}` : full
    }
    return full + ' ' + parts.slice(1).join(' ')
  }

  type Pane = {
    cmd: string
    dir?: string
    name?: string
  }
  function tmuxPane(pane: Pane) {
    const args = []
    args.push('send-keys')
    if (pane.dir) {
      args.push(`cd ${pane.dir}`, 'C-m')
    }
    args.push(alterCmd(pane.cmd), 'C-m', ';')

    if (pane.name) {
      args.push('rename-window', pane.name, ';')
    }
    return args
  }

  function toArray<T>(el: T): T extends any[] ? T : T[] {
    if (!el) return [] as any
    return (Array.isArray(el) ? el : [el]) as any
  }

  function runTmuxWithPanes(config: { 'before-all': string[]; panes: Pane[] }) {
    if (Array.isArray(config)) {
      logError(
        '💥 [breaking-change] Config must not be array. It must be object with panes key',
      )
    }
    let args = process.env.TMUX ? [] : ['new-session', ';']
    let first = true
    for (const pane of config.panes) {
      if (first) first = false
      else args.push('new-window', ';')
      args = args.concat(tmuxPane(pane))
    }
    const hooksBA = [tmux['hook-before-all']]
      .concat(tmux['hooks-before-all'])
      .concat(config['before-all'])
    for (let hookBA of hooksBA) {
      if (hookBA) {
        if (typeof hookBA === 'string') hookBA = hookBA.split(' ')
        run(hookBA[0], hookBA.slice(1))
      }
    }
    run('tmux', args)
    checkLatest()
    console.log('bye 👋 😸')
  }

  runTmuxWithPanes(conf)
}
