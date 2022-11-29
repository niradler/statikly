#!/usr/bin/env node
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const degit = require('degit');
const server = require("./server")

argv = yargs(hideBin(process.argv))
    .command('init', 'initialize example project', (yargs) => {
    }, (options) => {
        if (options.verbose) console.info(options)
        const emitter = degit('niradler/statikly-demo', {
            force: true,
            verbose: options.verbose,
        });
        emitter.clone(process.cwd()).then(() => {
            console.log('All set, start by running npm run serve');
        });
    })
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
            .option('prod', {
                describe: 'production mode',
                type: 'boolean',
                default: false
            })
    }, (options) => {
        if (options.verbose) console.info(options)
        server(options)
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
