import fs from 'fs'

export default (() => {
  let cache: any = null
  return () => {
    if (!cache) cache = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    return cache
  }
})()
