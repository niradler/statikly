const pathUtils = require('path');
const { toFilePath, getFiles, pathNormalize, pathToRoute, fileExists } = require('../utils/common');

const registerViewRoute = async (app, { templateEngine, url, viewPath, extend = {}, hasErrorPage }) => {
    const { actions, viewOption, loader } = extend;

    const viewRoue = {
        method: 'GET',
        url,
        handler: async (req, reply) => {
            const data = loader ? await loader(req, reply) : {};
            const csrf = await reply.generateCsrf();
            return reply[templateEngine](
                viewPath,
                {
                    query: req.query,
                    params: req.params,
                    data,
                    csrf,
                },
                viewOption
            );
        },
    };

    if (hasErrorPage) {
        viewRoue.errorHandler = (error, req, reply) => {
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
            preHandler: app.csrfProtection,

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

    const hasViews = await fileExists(viewsDir);
    app._logger('has views ', hasViews);
    if (hasViews) {
        const viewsFiles = await getFiles(pathNormalize(viewsDir) + `/**/*.${templateEngine}`);
        for await (const viewFile of viewsFiles) {
            const parsed = pathToRoute(viewFile.replace(pathNormalize(viewsDir), ''));
            const extendPath = pathUtils.join(viewsDir, parsed.dir, `${parsed.name}.js`);
            const hasExtend = await fileExists(extendPath);
            app._logger('view register', parsed.url, { hasExtend, extendPath });
            const hasErrorPage = await fileExists(pathUtils.join(viewsDir, `error.${templateEngine}`));

            await registerViewRoute(app, {
                templateEngine,
                url: parsed.url,
                viewPath: viewFile.replace(pathNormalize(rootDir), ''),
                extend: hasExtend ? require(extendPath) : {},
                hasErrorPage,
            });
        }
    }
    app._logger('app views registers complete');
};
