require('dotenv').config()
const Fastify = require("fastify");
const pathUtils = require("path");
const fs = require("fs/promises");
const { toFilePath, getFiles, pathNormalize, pathToRoute } = require("./utils")

const server = async (options = {}) => {
    try {
        const port = process.env.PORT || options.port || 3000
        const password = options.password || process.env.STATIKLY_PASSWORD
        const username = options.username || process.env.STATIKLY_USERNAME
        const isProd = process.env.NODE_ENV === 'production'
        const rootDir = toFilePath(process.env.STATIKLY_ROOT) || toFilePath(options.rootDir) || process.cwd();
        const publicDir = toFilePath(process.env.STATIKLY_PUBLIC_FOLDER, rootDir) || toFilePath(options.publicDir, rootDir) || toFilePath("./public", rootDir);
        const templateEngine = process.env.STATIKLY_TEMPLATE || options.templateEngine || "ejs";
        const layout = options.layout || process.env.STATIKLY_LAYOUT; //relative to root
        const viewsDir = toFilePath(process.env.STATIKLY_VIEWS, rootDir) || toFilePath(options.viewsDir, rootDir) || toFilePath("./views", rootDir);
        const apiDir = toFilePath(options.apiDir, rootDir) || toFilePath("./api", rootDir);
        const viewOptions = options.viewOptions || {}
        const logOptions = !isProd ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        } : true;

        const app = options.app || Fastify({ logger: logOptions });

        const registerViewRoute = ({ url, viewPath, loader }) => {
            const viewOption = loader.viewOption ? loader.viewOption : {}
            app.route({
                method: "GET",
                url,
                handler: (req, reply) => {
                    return reply.ejs(viewPath, {
                        query: req.query,
                        params: req.params,
                        data: req.actionData
                    }, viewOption);
                },
                preHandler: async (req, reply, done) => {
                    if (loader.handler) {
                        const data = await loader.handler(req, reply, done)
                        req.actionData = data;
                    }
                },
            });
        }

        await app.register(require('@fastify/routes'))
        await app.register(require('@fastify/sensible'))
        await app.register(require("@fastify/helmet"));
        await app.register(require('@fastify/formbody'))
        await app.register(require("@fastify/static"), {
            root: publicDir,
            prefix: `/public/`,
        });
        await app.register(require("@fastify/view"), {
            engine: {
                [templateEngine]: require(templateEngine),
            },
            root: rootDir,
            layout: layout ? layout : undefined,
            propertyName: templateEngine,
            defaultContext: {
                env: process.env,
            },
            options: viewOptions,
        });

        if (username && password) {
            const authenticate = { realm: 'statikly' }
            async function validate(usernameInput, passwordInput, req, reply) {
                if (username !== usernameInput || password !== passwordInput) {
                    return new Error('Unauthorized')
                }
            }
            await app.register(require('@fastify/basic-auth'), { validate, authenticate })
            app.addHook('onRequest', app.basicAuth)
        }

        const hasViews = await fs.stat(viewsDir).catch(e => false)
        if (hasViews) {
            const viewsFiles = await getFiles(pathNormalize(viewsDir) + `/**/*.${templateEngine}`)
            for await (const viewFile of viewsFiles) {
                const parsed = pathToRoute(viewFile.replace(pathNormalize(viewsDir), ""))
                const loaderPath = pathUtils.join(viewsDir, parsed.dir, "loader.js")
                const hasLoader = await fs.stat(loaderPath).catch(e => false)
                registerViewRoute({
                    url: parsed.url,
                    viewPath: viewFile.replace(pathNormalize(rootDir), ""),
                    loader: hasLoader ? require(loaderPath) : hasLoader
                })
            }
        }

        const hasApi = await fs.stat(apiDir).catch(e => false)
        if (hasApi) {
            const apiFiles = await getFiles(pathNormalize(apiDir) + `/**/*.js`)
            for await (const apiFile of apiFiles) {
                const parsed = pathToRoute(apiFile.replace(pathNormalize(apiDir), ""))
                const controller = require(apiFile)
                const methods = ["head", "post", "put", "delete", "options", "patch", "get"]
                await app.register(function (fastify, _, done) {
                    methods.forEach(method => {
                        if (controller[method]) {
                            fastify[method](parsed.url, controller[method])
                        }
                    })
                    done()
                }, { prefix: '/api' })

            }
        }

        await app.ready()
        if (!isProd) app.log.debug("routes", app.routes.keys())
        await app.listen({ port })
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

module.exports = server
