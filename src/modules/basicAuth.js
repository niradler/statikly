module.exports = async (app) => {
    const { password, username } = app._config;
    if (username && password) {
        const authenticate = { realm: 'statikly' };
        async function validate(usernameInput, passwordInput, req, reply) {
            if (username !== usernameInput || password !== passwordInput) {
                return new Error('Unauthorized');
            }
        }
        await app.register(require('@fastify/basic-auth'), { validate, authenticate });
        app.addHook('onRequest', app.basicAuth);
    } else {
        throw new Error('username and password must be provided');
    }
};
