require('dotenv').config()
const Fastify = require("fastify");
const pathUtils = require("path");
const fs = require("fs/promises");
const glob = require("glob")

const rootDir = process.env.STATIKLY_ROOT || process.cwd();
const staticDir = process.env.STATIKLY_STATIC_FOLDER || "public";
const templateEngine = process.env.STATIKLY_TEMPLATE || "ejs";
const layout = process.env.STATIKLY_LAYOUT;
const viewsDir = process.env.STATIKLY_VIEWS || "views";
const apiDir = "api";
const logOptions = {
    transport: {
        target: 'pino-pretty',
        options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        },
    },
}

const fastify = Fastify({ logger: logOptions });

fastify.register(require('@fastify/routes'))
fastify.register(require("@fastify/helmet"));
fastify.register(require("@fastify/static"), {
    root: pathUtils.join(rootDir, staticDir),
    prefix: `/${staticDir}/`,
});
fastify.register(require("@fastify/view"), {
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


const getFiles = (pattern) => {

    return new Promise((resolve, reject) => {
        glob(pattern, function (er, files) {
            if (er) reject(er)
            else resolve(files)
        })
    })
}

const pathNormalize = (path) => {
    return path.replace(/\\/ig, "/")

}
const pathToRoute = (path) => {
    const parsed = pathUtils.parse(path)
    const route = parsed
    if (parsed.name === 'index') {
        route.url = parsed.dir

    }
    else if (parsed.name.startsWith("[") && parsed.name.endsWith("]")) {
        route.url = `${parsed.dir}/:${parsed.name.slice(1, parsed.name.length - 1)}`
    }

    return route
}
const start = async () => {
    try {

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
        await fastify.listen({ port: process.env.PORT || 3000 })
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
