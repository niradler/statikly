const Path = require("path")
const esbuild = require('esbuild')
const { Router } = require('statikly-router')
const { toFilePath } = require('./common');

const bundle = async ({ path, output, watch, serve, bundle, sourcemap, minify, allowOverwrite }) => {
    path = toFilePath(path)
    const outdir = toFilePath(output)

    const router = new Router({ path });
    const jsFiles = await router.glob("**/*(*.js|*.css)");
    const buildOptions = {
        entryPoints: jsFiles.map(file => Path.join(path, file)),
        bundle,
        minify,
        sourcemap,
        allowOverwrite,
        outdir,
    }

    const ctx = await esbuild.context(buildOptions)
    if (watch) {
        console.log("watching for changes", path)
        ctx.watch()
    }
    else if (serve) {
        await ctx.serve({ servedir: path })
    } else {
        await esbuild.build(buildOptions)
    }
}


module.exports = { bundle }