#!/usr/bin/env -S node --enable-source-maps
import * as pkg from '../dist/docker-start.esm.js'

try {
  pkg.dockerRun(process.argv.slice(2))
} catch (e) {
  pkg.logError('message' in e ? e.message : e)
  process.exitCode = 1
}
