require('dotenv').config()
const Fastify = require("fastify");
const pathUtils = require("path");
const fs = require("fs/promises");
const { getFiles, pathNormalize, pathToRoute } = require("./utils")

const password = process.env.STATIKLY_PASSWORD
const username = process.env.STATIKLY_USERNAME
const isProd = process.env.NODE_ENV === 'production'
const rootDir = process.env.STATIKLY_ROOT || process.cwd();
const staticDir = process.env.STATIKLY_STATIC_FOLDER || "public";
const templateEngine = process.env.STATIKLY_TEMPLATE || "ejs";
const layout = process.env.STATIKLY_LAYOUT;
const viewsDir = process.env.STATIKLY_VIEWS || "views";
const apiDir = "api";
const logOptions = !isProd ? {
    transport: {
        target: 'pino-pretty',
        options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        },
    },
} : true;

const fastify = Fastify({ logger: logOptions });

const registerViewRoute = ({ url, viewPath, loader }) => {
    fastify.route({
        method: "GET",
        url,
        handler: (req, reply) => {
            return reply.ejs(viewPath, {
                query: req.query,
                params: req.params,
                data: req.actionData
            });
        },
        preHandler: async (req, reply, done) => {
            if (loader) {
                const data = await loader(req)
                req.actionData = data;
            }
        },
    });
}

const server = async (options = {}) => {
    try {
        const port = process.env.PORT || options.port || 3000
        await fastify.register(require('@fastify/routes'))
        await fastify.register(require("@fastify/helmet"));
        await fastify.register(require('@fastify/formbody'))
        await fastify.register(require("@fastify/static"), {
            root: pathUtils.join(rootDir, staticDir),
            prefix: `/${staticDir}/`,
        });
        await fastify.register(require("@fastify/view"), {
            engine: {
                [templateEngine]: require(templateEngine),
            },
            root: rootDir,
            layout: layout ? pathUtils.join(rootDir, layout) : undefined,
            propertyName: templateEngine,
            defaultContext: {
                env: process.env,
            },
            options: {},
        });
        if (username && password) {
            const authenticate = { realm: 'statikly' }
            async function validate(usernameInput, passwordInput, req, reply) {
                if (username !== usernameInput || password !== passwordInput) {
                    return new Error('Unauthorized')
                }
            }
            await fastify.register(require('@fastify/basic-auth'), { validate, authenticate })
            fastify.addHook('onRequest', fastify.basicAuth)

        }

        const hasViews = await fs.stat(pathUtils.join(rootDir, viewsDir)).catch(e => false)
        if (hasViews) {
            const viewsFiles = await getFiles(pathNormalize(pathUtils.join(rootDir, viewsDir)) + `/**/*.${templateEngine}`)
            for await (const viewFile of viewsFiles) {
                const viewPath = pathUtils.join(rootDir, viewsDir)
                const parsed = pathToRoute(viewFile.replace(pathNormalize(viewPath), ""))
                const loaderPath = pathUtils.join(rootDir, viewsDir, parsed.dir, "loader.js")
                const hasLoader = await fs.stat(loaderPath).catch(e => false)
                registerViewRoute({
                    url: parsed.url,
                    viewPath: viewFile.replace(pathNormalize(pathUtils.join(rootDir)), ""),
                    loader: hasLoader ? require(loaderPath).handler : hasLoader
                })
            }
        }

        const hasApi = await fs.stat(pathUtils.join(rootDir, apiDir)).catch(e => false)
        if (hasApi) {
            const apiFiles = await getFiles(pathNormalize(pathUtils.join(rootDir, apiDir)) + `/**/*.js`)
            for await (const apiFile of apiFiles) {
                const viewPath = pathUtils.join(rootDir, apiDir)
                const parsed = pathToRoute(apiFile.replace(pathNormalize(viewPath), ""))
                const controller = require(apiFile)
                const methods = ["head", "post", "put", "delete", "options", "patch", "get"]
                fastify.register(function (fastify, _, done) {
                    methods.forEach(method => {
                        if (controller[method]) {
                            fastify[method](parsed.url, controller[method])
                        }
                    })
                    done()
                }, { prefix: '/api' })

            }
        }

        await fastify.ready()
        if (!isProd) fastify.log.debug("routes", fastify.routes.keys())
        await fastify.listen({ port })
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

module.exports = server
