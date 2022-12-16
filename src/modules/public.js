module.exports = async (app) => {
    await app.register(require('@fastify/static'), {
        root: app._config.publicDir,
        prefix: `/public/`,
    });
};
