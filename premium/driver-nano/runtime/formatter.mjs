#!/usr/bin/env node

import process from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'

const file = process.argv[2]

if (!file) {
  process.stderr.write('formatter requires a file path\n')
  process.exit(1)
}

const source = await readFile(file, 'utf8')
await writeFile(file, source.toUpperCase(), 'utf8')
