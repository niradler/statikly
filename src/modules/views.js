const { Router } = require('statikly-router')
const { toFilePath } = require('../utils/common');

const registerViewRoute = async (app, { templateEngine, url, viewPath, extend = {}, hasErrorPage }) => {
    const { actions, viewOption, loader } = extend;
    const sessionInstalled = app._config.modules.includes('session');
    const viewRoue = {
        method: 'GET',
        url,
        handler: async (req, reply) => {
            const data = loader ? await loader(req, reply) : {};
            const viewData = {
                query: req.query,
                params: req.params,
                data,
            };
            if (sessionInstalled) {
                viewData.csrf = await reply.generateCsrf();
            }

            return reply[templateEngine](viewPath, viewData, viewOption);
        },
    };

    if (hasErrorPage) {
        viewRoue.errorHandler = (error, req, reply) => {
            app.log.error(error);
            return reply[templateEngine]('views/error', {
                query: req.query,
                params: req.params,
                data: {
                    message: app._config.isProd ? 'Something went wrong, please try again' : error.message,
                },
            });
        };
    }

    app.route(viewRoue);

    if (actions) {
        app.route({
            method: ['DELETE', 'PATCH', 'POST', 'PUT'],
            preHandler: sessionInstalled ? app.csrfProtection : undefined,
            url,
            handler: actions,
        });
    }
};

module.exports = async (app) => {
    const { rootDir, templateEngine, layout, viewsDir, viewOptions, context } = app._config;
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

    const router = new Router({ path: viewsDir });
    const routes = await router.scan();
    app._logger('has views ', routes);
    const hasErrorPage = routes['/error']
    for (const url in routes) {
        const route = routes[url];
        if (route[templateEngine]) {
            await registerViewRoute(app, {
                templateEngine,
                url,
                viewPath: `views/${route.ejs.dir}/${route.ejs.base}`,
                extend: route.js ? require(route.js.path) : {},
                hasErrorPage,
            });
        }
    }

    app._logger('app views registers complete');
};
