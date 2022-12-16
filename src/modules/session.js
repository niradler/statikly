module.exports = async (app) => {
    const { sessionSecret } = app._config;
    await app.register(require('@fastify/cookie'), { secret: sessionSecret });
    await app.register(require('@fastify/session'), { secret: sessionSecret, cookie: { secure: 'auto' } });
    await app.register(require('@fastify/csrf-protection'), {
        sessionPlugin: '@fastify/session',
    });
    await app.register(require('@fastify/flash'));
};
