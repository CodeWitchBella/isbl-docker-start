const https = require('https')
const fs = require('fs')
const readline = require('readline')
const { spawnSync } = require('child_process')

const registry = require('./package-json').registry || 'registry.npmjs.org'

function base64(string) {
  return Buffer.from(string).toString('base64')
}

function getToken(username, password) {
  return new Promise((resolve, reject) => {

    const options = {
      hostname: registry,
      port: 443,
      path: `/-/user/org.couchdb.user:${username}/-rev/undefined`,
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64(`${username}:${password}`)}`,
      }
    }

    const data = JSON.stringify({ name: username, password })

    let result = ''

    const req = https.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        result += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(result))
        } catch(e) {
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
  })
}

function npmSet(keyval) {
  spawnSync(
    'npm',
    ['set', keyval],
    { stdio: [null, 'inherit', 'inherit'] },
  )
}

function writeToken(username, token) {
  const keyvals = [
    `//${registry}/:_authToken=${token}`,
    `//${registry}/:always-auth=true`,
  ]
  keyvals.forEach(npmSet)

  keyvals.push(`registry=https://${registry}`)
  fs.writeFileSync('npm-token', keyvals.join('\n'), 'utf-8')
}

async function getCredentials() {
  if(process.argv.length >= 4) {
    return {
      username: process.argv[2],
      password: process.argv[3],
    }
  } else {
    console.log('Username: ')
    const username = await readLine()
    console.log('Password: ')
    const password = await readLine()
    return {username, password}
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

function readLine() {
  return new Promise((resolve, reject) => {
    rl.once('line', resolve)
  })
}

// start
;(async () => {
  try {
    const {username, password} = await getCredentials()

    setTimeout(() => {
      console.error('Timeout')
    }, 20000)    

    const r = await getToken(username, password)

    if(!r.ok) {
      console.error(r)
      process.exit(2)
    } else {
      writeToken(username, r.token)
      process.exit(0)
    }

  } catch(e) {
    console.error(e)
    process.exit(1)
  }
})()
