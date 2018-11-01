#!/usr/bin/env node

/* eslint-disable import/no-commonjs */

try {
    require('../build/docker-run.js').default(process.argv.slice(2))
} catch(e) {
    require('../build/docker-prepare').logError('message' in e ? e.message : e)
    process.exitCode = 1
}
