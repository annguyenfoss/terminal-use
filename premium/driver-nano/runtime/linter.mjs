#!/usr/bin/env node

import process from 'node:process'
const file = process.argv[2]

if (!file) {
  process.stderr.write('linter requires a file path\n')
  process.exit(1)
}

process.stdout.write(`${file}:1:1: lint says hello\n`)
