const Path = require("path")
const esbuild = require('esbuild')
const { Router } = require('statikly-router')
const { toFilePath } = require('./common');

const bundle = async ({ path, output, watch, config: configPath }) => {
    if (!configPath) {
        configPath = Path.join(__dirname, "build.config.js")
    }
    const getConfig = require(configPath)
    const config = await getConfig({ path, output, watch, config: configPath });
    path = toFilePath(path)
    const outdir = toFilePath(output)
    if (!config.entryPoints) {
        const router = new Router({ path });
        const files = await router.glob("**/*(*.js|*.css|*.html|*.ts|*.tsx)");
        config.entryPoints = files.map(file => Path.join(path, file))
    }

    const buildOptions = {
        outdir,
        ...config,
    }

    const ctx = await esbuild.context(buildOptions)
    if (watch) {
        console.log("watching for changes", path)
        ctx.watch()
    } else {
        await esbuild.build(buildOptions)
        process.exit(0);
    }
}


module.exports = { bundle }