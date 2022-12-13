const pathUtils = require('path');
const fs = require('fs/promises');
const { toFilePath, getFiles, pathNormalize, pathToRoute } = require('../utils/common');

const registerViewRoute = (app, { url, viewPath, loader }) => {
    const viewOption = loader.viewOption ? loader.viewOption : {};
    delete loader.viewOption;
    app.route({
        method: 'GET',
        url,
        handler: async (req, reply) => {
            return reply.ejs(
                viewPath,
                {
                    query: req.query,
                    params: req.params,
                    data: req.data,
                },
                viewOption
            );
        },
        ...loader,
    });
};

const fullstack = async (app) => {
    const { password, username, sessionSecret, rootDir, publicDir, templateEngine, layout, viewsDir, apiDir, viewOptions, context } = app._config;
    await app.register(require('@fastify/cors'), {});
    await app.register(require('@fastify/routes'));
    await app.register(require('@fastify/cookie'), { secret: sessionSecret });
    await app.register(require('@fastify/session'), { secret: sessionSecret, cookie: { secure: 'auto' } });
    await app.register(require('@fastify/csrf-protection'), { cookieOpts: { signed: true } });
    await app.register(require('@fastify/sensible'));
    await app.register(require('@fastify/flash'));
    await app.register(require('@fastify/helmet'));
    await app.register(require('@fastify/formbody'));
    await app.register(require('@fastify/caching'), { expiresIn: 300, serverExpiresIn: 300 });
    await app.register(require('@fastify/static'), {
        root: publicDir,
        prefix: `/public/`,
    });
    await app.register(require('@fastify/view'), {
        engine: {
            [templateEngine]: require(templateEngine),
        },
        root: rootDir,
        layout: layout ? layout : undefined,
        propertyName: templateEngine,
        defaultContext: {
            context,
            env: process.env,
            fromRoot: (path) => toFilePath(path, rootDir),
        },
        options: viewOptions,
    });
    if (username && password) {
        const authenticate = { realm: 'statikly' };
        async function validate(usernameInput, passwordInput, req, reply) {
            if (username !== usernameInput || password !== passwordInput) {
                return new Error('Unauthorized');
            }
        }
        await app.register(require('@fastify/basic-auth'), { validate, authenticate });
        app.addHook('onRequest', app.basicAuth);
    }
    app._logger('app middleware registers complete');

    const hasViews = !!(await fs.stat(viewsDir).catch((e) => false));
    app._logger('has views ', hasViews);
    if (hasViews) {
        const viewsFiles = await getFiles(pathNormalize(viewsDir) + `/**/*.${templateEngine}`);
        for await (const viewFile of viewsFiles) {
            const parsed = pathToRoute(viewFile.replace(pathNormalize(viewsDir), ''));
            const loaderPath = pathUtils.join(viewsDir, parsed.dir, 'loader.js');
            const hasLoader = !!(await fs.stat(loaderPath).catch((e) => false));
            app._logger('view register', parsed.url, { hasLoader });
            registerViewRoute(app, {
                url: parsed.url,
                viewPath: viewFile.replace(pathNormalize(rootDir), ''),
                loader: hasLoader ? require(loaderPath) : hasLoader,
            });
        }
    }
    app._logger('app views registers complete');
    const hasApi = !!(await fs.stat(apiDir).catch((e) => false));
    app._logger('has api routes', hasApi);
    if (hasApi) {
        const apiFiles = await getFiles(pathNormalize(apiDir) + `/**/*.js`);
        for await (const apiFile of apiFiles) {
            const parsed = pathToRoute(apiFile.replace(pathNormalize(apiDir), ''));
            const controller = require(apiFile);
            const methods = ['head', 'post', 'put', 'delete', 'options', 'patch', 'get'];

            await app.register(
                function (app, _, done) {
                    methods.forEach((method) => {
                        if (controller[method]) {
                            app._logger('api register', method.toUpperCase(), parsed.url);
                            app.route({
                                method: method.toUpperCase(),
                                url: parsed.url,
                                handler: controller[method].handler,
                                preHandler: controller[method].preHandler,
                                onRequest: controller[method].onRequest,
                                schema: controller[method].schema,
                                onError: controller[method].onError,
                                errorHandler: controller[method].errorHandler,
                                constraints: controller[method].constraints,
                                preValidation: controller[method].preValidation,
                            });
                        }
                    });
                    done();
                },
                { prefix: '/api' }
            );
        }
    }
    app._logger('app apis registers complete');
};

module.exports = fullstack;
