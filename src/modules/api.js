const { getFiles, pathNormalize, pathToRoute, fileExists } = require('../utils/common');

module.exports = async (app) => {
    const { apiDir } = app._config;
    const hasApi = await fileExists(apiDir);
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
