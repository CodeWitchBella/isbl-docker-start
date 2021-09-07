import fs from 'fs'

export default (() => {
  let cache: any = null
  return () => {
    if (!cache) cache = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    return cache
  }
})()

export const isYarn = (() => {
  let cache: any = null
  return () => {
    if (!cache) cache = isYarnImpl()
    return cache
  }
})()

function isYarnImpl() {
  try {
    fs.statSync('yarn.lock')
    return true
  } catch (e) {
    return false
  }
}
