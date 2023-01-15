
module.exports = async () => {
    const buildOptions = {
        bundle: true,
        minify: false,
        sourcemap: false,
        allowOverwrite: true,
        logLevel: "info",
    }

    return buildOptions;
}