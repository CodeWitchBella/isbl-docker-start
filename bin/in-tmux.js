#!/usr/bin/env -S node --enable-source-maps
import * as pkg from '../dist/docker-start.esm.js'
pkg.inTmux(process.argv.slice(2))
