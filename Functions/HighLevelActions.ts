import chalk from 'chalk';
import { exec } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { moveSync } from 'fs-extra';

import Mod, { Dependency } from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';
import DataInteraction from './DataInteraction';
import OnlineInteractions from './OnlineInteractions';
import UserInteration from './UserInteraction';

const MODTEMP = process.env.APPDATA + '/Factorio Mod Updater/';
const MODDIR = process.env.APPDATA + '/Factorio/mods/';

type InstallType = 'update' | 'install';

function isGameRunning(): Promise<boolean> {
	return new Promise(resolve => {
		exec('tasklist', (err, stdout) => {
			resolve(stdout.toLowerCase().indexOf('factorio.exe') > -1);
		});
	});
}

async function installMod(mod: Mod, type: InstallType) {
	const time = Date.now();
	if (type == 'install') {
		console.log('Installing ' + chalk.bold(mod.title));
	} else {
		console.log('Updating ' + chalk.bold(mod.title));
	}
	console.log('[1/4] Checking...');
	if (type == 'install') {
		if (existsSync(MODDIR + DataInteraction.clearName(mod.name))) {
			ConsoleInteractions.clearLine();
			console.log('Mod already installed');
			return;
		}
	}
	ConsoleInteractions.clearLine();
	console.log('[2/4] Downloading...');
	await OnlineInteractions.downloadMod(mod.name, mod.version).catch(() => {
		ConsoleInteractions.clearLine();
		console.log(chalk.redBright('An error occurred while downloading this mod.'));
		return;
	});
	ConsoleInteractions.clearLine();
	console.log('[3/4] Unzipping...');
	if (!DataInteraction.unzip()) {
		ConsoleInteractions.clearLine();
		console.log(chalk.redBright('An error occurred while unzipping this mod.'));
		return;
	}
	ConsoleInteractions.clearLine();
	if (type == 'install') {
		console.log('[4/4] Installing...');
	} else {
		console.log('[4/4] Updating...');
	}
	try {
		if (type == 'update') {
			rmSync(MODDIR + mod.name, { recursive: true, force: true });
		}
		moveSync(MODTEMP + 'mod/' + DataInteraction.clearName(mod.name), MODDIR + DataInteraction.clearName(mod.name));
	} catch (err) {
		ConsoleInteractions.clearLine();
		if (type == 'install') {
			console.log(chalk.redBright('An error occurred while installing this mod.'));
		} else {
			console.log(chalk.redBright('An error occurred while updating this mod.'));
		}
		return;
	}
	ConsoleInteractions.clearLine();
	ConsoleInteractions.clearLine();
	const timeNow = Date.now() - time;
	if (type == 'install') {
		console.log(chalk.bold(mod.title) + ' installed in ' + (timeNow / 1000).toFixed(2) + 's');
	} else {
		console.log(chalk.bold(mod.title) + ' updated in ' + (timeNow / 1000).toFixed(2) + 's');
	}

	mod = DataInteraction.Installed.fetchMod(mod.name);
	if (!checkModState(mod)) {
		await checkDependencies(mod);
	}
}

function uninstallMod(mod: Mod) {
	console.log('Uninstalling ' + chalk.bold(mod.title) + '...');
	rmSync(MODDIR + mod.name, { recursive: true, force: true });
	ConsoleInteractions.clearLine();
	console.log('Successfully uninstalled ' + chalk.bold(mod.title));
}

function checkModState(mod: Mod) {
	const AllDependencies = mod.dependencies;

	if (AllDependencies.length == 0) {
		return true;
	}

	const ConflictsDeps: Array<Dependency> = [];
	const RequiredDeps: Array<Dependency> = [];
	AllDependencies.forEach(el => {
		if (el.type == 'Conflict') {
			ConflictsDeps.push(el);
		} else if (el.type == 'Required') {
			RequiredDeps.push(el);
		}
	});

	let state = true;

	// Check conflicts
	ConflictsDeps.forEach(dep => {
		if (DataInteraction.Installed.isInstalled(dep.name)) {
			state = false;
		}
	});

	// Check required
	RequiredDeps.forEach(dep => {
		if (dep.name == 'base') return;
		if (!DataInteraction.Installed.isInstalled(dep.name)) {
			state = false;
		}
	});

	return state;
}

async function checkDependencies(mod: Mod) {
	const AllDependencies = mod.dependencies;

	if (AllDependencies.length == 0) {
		return;
	}

	const ConflictsDeps: Array<Dependency> = [];
	const RequiredDeps: Array<Dependency> = [];
	AllDependencies.forEach(el => {
		if (el.type == 'Conflict') {
			ConflictsDeps.push(el);
		} else if (el.type == 'Required') {
			RequiredDeps.push(el);
		}
	});

	// Check conflicts
	const toRemove = new Array<{ name: string; value: Mod; checked: boolean }>();
	ConflictsDeps.forEach(dep => {
		if (DataInteraction.Installed.isInstalled(dep.name)) {
			const dependency = DataInteraction.Installed.fetchMod(dep.name);
			toRemove.push({
				name: dependency.title,
				value: dependency,
				checked: true
			});
		}
	});

	if (toRemove.length) {
		console.log('Theses mods are in ' + chalk.redBright('CONFLICT') + ' with ' + chalk.bold(mod.title));
		const choices = await UserInteration.CheckBox('Select mods to remove', toRemove);
		console.log('');
		choices.forEach(uninstallMod);
	}

	// Check required
	const toInstall = RequiredDeps.filter(
		dep => dep.name != 'base' && !DataInteraction.Installed.isInstalled(dep.name)
	);

	if (toInstall.length) {
		console.log('Fetching dependencies...');
		const toInstallMods = await OnlineInteractions.fetchMods(toInstall.map(v => v.name));
		ConsoleInteractions.clearLine();

		for (const mod of toInstallMods) {
			await installMod(mod, 'install');
		}
	}
}

async function updateAllMods() {
	const localMods = DataInteraction.Installed.getMods();
	const modList = DataInteraction.Installed.getList();

	console.log('Fetching mods...');
	const newMods = await OnlineInteractions.fetchMods(modList);
	ConsoleInteractions.clearLine();

	const upgradeMods: Array<Mod> = [];
	newMods.forEach((newMod, i) => {
		const localMod = localMods[i];
		if (newMod.version != localMod.version) {
			if (upgradeMods.length == 0) {
				console.log('Mods to update :\n');
			}
			console.log(
				chalk.bold(localMod.title) +
					': ' +
					chalk.gray(localMod.version) +
					' -> ' +
					chalk.underline(newMod.version)
			);
			upgradeMods.push(newMod);
		}
	});
	if (upgradeMods.length == 0) {
		console.log('Mods up to date !');
		return;
	}

	console.log('');
	const toUpdate = await UserInteration.CheckBox(
		'Select mods to update',
		upgradeMods.map(mod => {
			return { name: mod.title, value: mod.name, checked: true };
		})
	);

	const toUpgrade = upgradeMods.filter(mod => toUpdate.includes(mod.name));

	if (toUpgrade.length == 0) {
		return;
	}

	const time = Date.now();
	console.log('\n');

	for (const mod of toUpgrade) {
		await installMod(mod, 'update');
	}

	const newTime = Date.now() - time;
	console.log('Mods updated in ' + (newTime / 1000).toFixed(2) + 's');
}

function isModUnderDependency(mod: Mod) {
	const modList = DataInteraction.Installed.getMods();
	for (const localMod of modList) {
		for (const dep of localMod.dependencies) {
			if (dep.type == 'Required') {
				if (dep.name == mod.name) {
					return localMod;
				}
			}
		}
	}
	return;
}

const HighLevelActions = {
	checkDependencies,
	checkModState,
	installMod,
	isGameRunning,
	isModUnderDependency,
	uninstallMod,
	updateAllMods
};
export default HighLevelActions;
