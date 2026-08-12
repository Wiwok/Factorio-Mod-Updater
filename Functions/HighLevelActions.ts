import { checkbox } from '@inquirer/prompts';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import { Listr, ListrTask } from 'listr2';
import { exec } from 'node:child_process';
import { rename, rm } from 'node:fs/promises';
import path from 'node:path';

import { LocalMod, Mod, OnlineMod } from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';
import DataInteraction from './DataInteraction';
import OnlineInteractions from './OnlineInteractions';

const MODTEMP = process.env.APPDATA + '/Factorio Mod Updater/';
const MODDIR = process.env.APPDATA + '/Factorio/mods/';

type InstallType = 'update' | 'install';

function isGameRunning() {
	return new Promise<boolean>(resolve => {
		exec('tasklist', (_, stdout) => {
			resolve(stdout.toLowerCase().includes('factorio.exe'));
		});
	});
}

function createInstallTasks(mod: LocalMod, type: InstallType, log?: (message: string) => void): Array<ListrTask> {
	return [
		{
			title: 'Download mod',
			task: async (_, task) => {
				await OnlineInteractions.downloadMod(mod.name, mod.version, (p, d, s) => {
					task.output = `Download mod ${ConsoleInteractions.formatSize(d)}/${ConsoleInteractions.formatSize(s)} (${p.toFixed()}%)`;
					if (log)
						log(
							`Downloading... ${ConsoleInteractions.formatSize(d)}/${ConsoleInteractions.formatSize(s)} (${p.toFixed()}%)`
						);
				}).catch(() => {
					throw new Error('An error occurred while downloading this mod');
				});
			},
			retry: {
				tries: 3,
				delay: 5000
			}
		},
		{
			title: 'Extract files',
			task: async (_, task) => {
				const success = await DataInteraction.unzip(mod.name, (p, e, s) => {
					task.output = `Extract files ${ConsoleInteractions.formatSize(e)}/${ConsoleInteractions.formatSize(s)} (${p.toFixed()}%)`;
					if (log)
						log(
							`Extracting... ${ConsoleInteractions.formatSize(e)}/${ConsoleInteractions.formatSize(s)} (${p.toFixed()}%)`
						);
				});
				if (!success) throw new Error('An error occurred while extracting this mod');
			}
		},
		{
			title: 'Verify mod integrity',
			task: async () => {
				await Promise.resolve(DataInteraction.getTempMod(mod.name))
					.catch(err => {
						throw new Error('An error occurred while verifying this mod: ' + err);
					})
					.then(newMod => {
						if (newMod.name != mod.name || newMod.version != mod.version) {
							throw new Error('Mod integrity compromised');
						}
					});
			}
		},
		{
			title: 'Move files into place',
			task: async () => {
				if (log) log('Moving files into place...');
				try {
					if (type == 'update') {
						await rm(path.join(MODDIR, mod.name), {
							recursive: true,
							force: true
						});
					}
					await rename(path.join(MODTEMP, 'mod', mod.name), path.join(MODDIR, mod.name));
				} catch (err: any) {
					if (err?.code == 'EBUSY') {
						throw new Error(
							'The mod folder is currently in use. Please close any program that might be using it and try again'
						);
					} else {
						throw new Error('An error occurred while moving files');
					}
				}
			},
			retry: {
				tries: 3,
				delay: 5000
			}
		},
		{
			title: 'Install dependencies',
			task: async (_, task) => {
				const dependencies = await mod.getDependenciesToModify();
				if (dependencies.length == 0) {
					task.skip('No dependencies to install');
					return;
				}

				const requiredDependencies = (
					await OnlineInteractions.fetchMods(dependencies.filter(v => v.type == 'Required').map(v => v.name))
				).filter(v => v != undefined);

				if (requiredDependencies.length == 0) return;

				return task.newListr(
					requiredDependencies.map(dep => ({
						title: 'Install ' + dep.title,
						task: async (_, subTask) => {
							subTask.output = 'Installing...';
							const log = (message: string) => (subTask.output = message);
							await new Listr(createInstallTasks(dep, 'install', log), { renderer: 'silent' }).run();
						}
					})),
					{ concurrent: 3 }
				);
			}
		}
	];
}

async function installMod(mod: OnlineMod, type: InstallType) {
	const tasks = new Listr(createInstallTasks(mod, type));
	try {
		await tasks.run();
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
	}
	console.log('');
}

async function uninstallMod(mod: Mod) {
	const tasks = new Listr([
		{
			title: 'Remove files',
			task: async () => rm(path.join(MODDIR, mod.name), { recursive: true, force: true })
		}
	]);
	try {
		await tasks.run();
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
	}
}

async function updateAllMods(localMods: Array<LocalMod>) {
	const tasks = new Listr<{
		mods: Array<OnlineMod>;
	}>([
		{
			title: 'Fetch mods information',
			task: async (ctx, task) => {
				ctx.mods = (
					await OnlineInteractions.fetchMods(
						localMods.map(mod => mod.name),
						(completed, total) => {
							task.output = `Fetched ${completed}/${total} (${Math.round((completed / total) * 100)}%)`;
						}
					)
				).filter(m => m !== undefined);
				task.title = 'Fetch mods information';
			}
		},
		{
			title: 'Check for updates',
			task: async ctx => {
				ctx.mods = ctx.mods.filter(mod => mod.version != localMods.find(m => m.name === mod.name)?.version);
			}
		},
		{
			title: 'Update mods',
			task: async (ctx, task) => {
				if (ctx.mods.length == 0) {
					return;
				}

				try {
					const selected = (await task
						.prompt(ListrInquirerPromptAdapter)
						.run(checkbox, {
							message: 'Select mods to update',
							choices: ctx.mods.map(mod => {
								const oldMod = localMods.find(m => m.name === mod.name);
								return {
									name: mod.title + ` ${oldMod?.version ?? 'unknown'} -> ${mod.version}`,
									value: mod.name,
									checked: true,
									description: mod.getChangelog(oldMod?.version ?? 'unknown', mod.version)
								};
							})
						})
						.catch(() => (ctx.mods = []))) as Array<string>;
					ctx.mods = ctx.mods.filter(mod => selected.includes(mod.name));
				} catch {
					ctx.mods = [];
				}

				if (ctx.mods.length == 0) {
					task.skip('No update needed');
					return;
				}

				return new Listr(
					ctx.mods.map(mod => ({
						title: 'Update ' + mod.title,
						task: () => new Listr(createInstallTasks(mod, 'update'))
					})),
					{ concurrent: 3 }
				);
			},
			skip: ctx => (ctx.mods.length == 0 ? 'All mods are up to date' : false)
		}
	]);
	try {
		await tasks.run();
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
	}
	console.log('');
}

const HighLevelActions = {
	installMod,
	isGameRunning,
	uninstallMod,
	updateAllMods
};
export default HighLevelActions;
