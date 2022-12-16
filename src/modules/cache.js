module.exports = async (app, config = { expiresIn: 300, serverExpiresIn: 300 }) => {
    await app.register(require('@fastify/caching'), config);
};
