const appModules = require('./index');

const run = async (app) => {
    const { modules, corsOrigin } = app._config;
    await app.register(require('@fastify/cors'), {
        origin: corsOrigin,
    });
    await app.register(require('@fastify/helmet'));
    await app.register(require('@fastify/routes'));
    await app.register(require('@fastify/formbody'));
    await app.register(require('@fastify/sensible'));
    for await (const moduleName of modules) {
        await appModules[moduleName](app);
    }
};

module.exports = run;
