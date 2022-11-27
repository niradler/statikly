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
            .option('username', {
                describe: 'basic auth username',
                default: undefined
            })
            .option('password', {
                describe: 'basic auth password',
                default: undefined
            })
            .option('rootDir', {
                describe: 'root directory',
                default: process.cwd()
            })
            .option('publicDir', {
                describe: 'public directory',
                default: "./public"
            })
            .option('templateEngine', {
                describe: 'template engine',
                default: 'ejs'
            })
            .option('viewsDir', {
                describe: 'views directory',
                default: "./views"
            })
            .option('layout', {
                describe: 'template engine',
                default: undefined
            })
            .option('apiDir', {
                describe: 'api directory',
                default: './api'
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
