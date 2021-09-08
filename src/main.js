import chalk from "chalk";
import fs from 'fs';
import ncp from 'ncp';
import path, { dirname } from 'path';
import { promisify } from "util";
import execa from 'execa';
import listr from 'listr';
import { projectInstall } from 'pkg-install';
import { fileURLToPath } from "url";

const access = promisify(fs.access);

const copy = promisify(ncp);

async function copyTemplateFiles(options) {
    return copy(options.templateDirectory, options.targetDirectory, {
        clobber: false,
    });
}

async function initGit(options) {
    const result = await execa('git', ['init'], {
        cwd: options.targetDirectory,
    })
    if (result.failed) {
        return Promise.reject(new Error('failed to initialize Git'));
    }
}

export async function createProject(options) {
    options = {
        ...options,
        targetDirectory: options.targetDirectory || process.cwd()
    };

    const currentFileUrl = dirname(fileURLToPath(import.meta.url));
    const templateDir = path.resolve(
        new URL(currentFileUrl).pathname,
        '../templates',
        options.template.toLowerCase()
    );
    console.log(templateDir, currentFileUrl)
    options.templateDirectory = templateDir;

    try {
        await access(templateDir, fs.constants.R_OK)
    }
    catch (err) {
        console.error('%s Invalid template name', chalk.red.bold('ERROR'))
        process.exit(1);
    }

    const tasks = new listr([
        {
            title: 'Copy project files',
            task: () => copyTemplateFiles(options)
        },
        {
            title: 'Initialize git',
            task: () => initGit(options),
            enabled: () => options.git
        },
        {
            title: 'Install dependencies',
            task: () => projectInstall({
                cwd: options.targetDirectory,
            }),
            skip: () => !options.runInstall ? 'Pass --install to automatically install' : undefined,
        }
    ]);

    await tasks.run()

    console.log('%s Project ready', chalk.green.bold('DONE'));
    return true;
}