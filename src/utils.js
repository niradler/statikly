const pathUtils = require("path");
const glob = require("glob")

const getFiles = (pattern) => {
    return new Promise((resolve, reject) => {
        glob(pattern, function (er, files) {
            if (er) reject(er)
            else resolve(files)
        })
    })
}

const pathNormalize = (path) => {
    return path.replace(/\\/ig, "/")
}

const pathToRoute = (path) => {
    const parsed = pathUtils.parse(path)
    const route = parsed
    if (parsed.name === 'index') {
        route.url = parsed.dir

    }
    else if (parsed.name.startsWith("[") && parsed.name.endsWith("]")) {
        route.url = `${parsed.dir}/:${parsed.name.slice(1, parsed.name.length - 1)}`
    } else {
        route.url = `/${parsed.name}`
    }

    return route
}

const toFilePath = (path, root = process.cwd()) => {
    if (!path) return
    return pathUtils.isAbsolute(path) ? path : pathUtils.join(root, path)
}

module.exports = { getFiles, pathNormalize, pathToRoute, toFilePath }