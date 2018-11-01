#!/usr/bin/env node

/* eslint-disable import/no-commonjs */

require('../build/in-tmux.js').default(process.argv.slice(2))
