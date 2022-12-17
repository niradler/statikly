const pathUtils = require('path');
const fs = require('fs/promises');
const glob = require('glob');

const getFiles = (pattern) => {
    return new Promise((resolve, reject) => {
        glob(pattern, function (er, files) {
            if (er) reject(er);
            else resolve(files);
        });
    });
};

const pathNormalize = (path) => {
    return path.replace(/\\/gi, '/');
};

const pathToRoute = (path) => {
    const parsed = pathUtils.parse(path);
    parsed.url = `${parsed.dir}${parsed.name === 'index' ? '' : '/'}${parsed.name === 'index' ? '' : parsed.name}`.replace(/\[/g, ':').replace(/\]/g, '');

    return parsed;
};

const toFilePath = (path, root = process.cwd()) => {
    if (!path) return;
    return pathUtils.isAbsolute(path) ? path : pathUtils.join(root, path);
};

const generateSecret = (length) =>
    new Array(length)
        .fill(0)
        .map(() => Math.floor(Math.random() * 10))
        .join('');

const readJSON = async (path, rootDir) => (path ? JSON.parse(await fs.readFile(toFilePath(path, rootDir))) : {});
const fileExists = async (path) => !!(await fs.stat(path).catch((e) => false));

module.exports = { getFiles, pathNormalize, pathToRoute, toFilePath, generateSecret, readJSON, fileExists };
