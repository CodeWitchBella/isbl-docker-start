#!/usr/bin/env node

/* eslint-disable import/no-commonjs */

try {
  require('..').dockerRun(process.argv.slice(2))
} catch (e) {
  require('..').logError('message' in e ? e.message : e)
  process.exitCode = 1
}
