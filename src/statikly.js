#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const degit = require('degit');
const server = require('./server');
const { readJSON } = require('./utils/common');

argv = yargs(hideBin(process.argv))
    .command(
        'init',
        'initialize example project',
        (yargs) => {},
        (options) => {
            if (options.verbose) console.info(options);
            const emitter = degit('niradler/statikly-demo', {
                force: true,
                verbose: options.verbose,
            });
            emitter.clone(process.cwd()).then(() => {
                console.log('All set, start by running npm run serve');
            });
        }
    )
    .command(
        'modules',
        'list available modules',
        (yargs) => {},
        (options) => {
            if (options.verbose) console.info(options);
            const modules = require('./modules');
            console.log(JSON.stringify(Object.keys(modules), null, 2));
        }
    )
    .command(
        'serve',
        'start the server',
        (yargs) => {
            return yargs
                .option('port', {
                    describe: 'port to bind on',
                    default: 3000,
                })
                .option('username', {
                    describe: 'basic auth username',
                    default: undefined,
                })
                .option('password', {
                    describe: 'basic auth password',
                    default: undefined,
                })
                .option('rootDir', {
                    describe: 'root directory',
                    default: process.cwd(),
                })
                .option('publicDir', {
                    describe: 'public directory, for static assets',
                    default: './public',
                })
                .option('templateEngine', {
                    describe: 'template engine',
                    default: 'ejs',
                })
                .option('viewsDir', {
                    describe: 'views directory',
                    default: './views',
                })
                .option('layout', {
                    describe: 'layout file',
                    default: undefined,
                })
                .option('apiDir', {
                    describe: 'api directory',
                    default: './api',
                })
                .option('prod', {
                    describe: 'production mode',
                    type: 'boolean',
                    default: false,
                })
                .option('context', {
                    alias: 'ctx',
                    describe: 'pass context data as json file',
                })
                .option('sessionSecret', {
                    alias: 'sc',
                    describe: 'session secret',
                })
                .option('viewOptions', {
                    describe: 'view options file (json), will be pass to template engine',
                })
                .option('corsOrigin', {
                    describe: 'cors origin, support multiple origins',
                    type: 'array',
                    default: ['localhost'],
                })
                .option('modules', {
                    describe: 'modules',
                    alias: 'm',
                    type: 'array',
                    default: ['cache', 'session', 'views', 'api', 'public'],
                })
                .option('optionsFile', {
                    description: 'provide options file (json) instead of passing them as arguments',
                })
                .option('host', {
                    describe: 'listener host',
                    default: 'localhost',
                });
        },
        async (options) => {
            try {
                if (options.optionsFile) {
                    const optionsFromFile = await readJSON(options.optionsFile, options.rootDir);
                    options = { ...options, ...optionsFromFile };
                }

                if (options.verbose) {
                    console.info('argv', options);
                }

                const app = await server(options);

                await app.ready();
                app._logger('routes', app.routes.keys());
                await app.listen({ port: app._config.port, host: app._config.host });
            } catch (err) {
                console.error(err);
                process.exit(1);
            }
        }
    )
    .demandCommand(1, '')
    .recommendCommands()
    .strict()
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
    })

    .parse();
