#!/usr/bin/env node
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const server = require("./server")

argv = yargs(hideBin(process.argv))
    .command('serve', 'start the server', (yargs) => {
        return yargs
            .option('port', {
                describe: 'port to bind on',
                default: 3000
            })
    }, (argv) => {
        if (argv.verbose) console.info(`start server on :${argv.port}`)
        server(argv)
    })
    .demandCommand(1, '')
    .recommendCommands()
    .strict()
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging'
    })
    .parse()
