import https from 'https'
import fs from 'fs'
import readline from 'readline'
import { spawnSync } from 'child_process'
import packagejson from './package-json'

function base64(string: string) {
  return Buffer.from(string).toString('base64')
}

function getToken(username: string, password: string, registry: string) {
  return new Promise<{ ok: false } | { ok: true; token: string }>(
    (resolve, reject) => {
      const options = {
        hostname: registry,
        port: 443,
        path: `/-/user/org.couchdb.user:${username}/-rev/undefined`,
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${base64(`${username}:${password}`)}`,
        },
      }

      const data = JSON.stringify({ name: username, password })

      let result = ''

      const req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`)
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`)
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          result += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(result))
          } catch (e) {
            reject(e)
          }
        })
      })

      req.on('error', (e) => {
        reject(e)
      })

      // write data to request body
      req.write(data)
      req.end()
    },
  )
}

function npmSet(keyval: string) {
  spawnSync('npm', ['set', keyval], { stdio: [null, 'inherit', 'inherit'] })
}

function writeToken(username: string, token: string, registry: string) {
  const keyvals = [
    `//${registry}/:_authToken=${token}`,
    `//${registry}/:always-auth=true`,
  ]
  keyvals.forEach(npmSet)

  keyvals.push(`registry=https://${registry}`)
  fs.writeFileSync('npm-token', keyvals.join('\n'), 'utf-8')
}

async function getCredentials() {
  if (process.argv.length >= 4) {
    return {
      username: process.argv[2],
      password: process.argv[3],
    }
  }
  console.log('Username: ')
  const username = await readLine()
  console.log('Password: ')
  const password = await readLine()
  return { username, password }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

function readLine() {
  return new Promise<string>((resolve, reject) => {
    rl.once('line', resolve)
  })
}

// start
;(async () => {
  const registry = packagejson().registry || 'registry.npmjs.org'
  try {
    const { username, password } = await getCredentials()

    setTimeout(() => {
      console.error('Timeout')
    }, 20000)

    const r = await getToken(username, password, registry)

    if (!r.ok) {
      console.error(r)
      process.exit(2)
    } else {
      writeToken(username, r.token, registry)
      process.exit(0)
    }
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
