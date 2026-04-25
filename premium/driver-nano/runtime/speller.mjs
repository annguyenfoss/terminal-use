#!/usr/bin/env node

import process from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'

const file = process.argv[2]

if (file) {
  const source = await readFile(file, 'utf8')
  await writeFile(file, source.replaceAll('alpha', 'omega'), 'utf8')
} else {
  let source = ''

  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) {
    source += chunk
  }

  process.stdout.write(source.replaceAll('alpha', 'omega'))
}
