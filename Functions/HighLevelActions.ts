import chalk from 'chalk';
import fs from 'fs';
import fse from 'fs-extra';

import Mod, { Dependency } from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';
import DataInteraction from './DataInteraction';
import OnlineInteractions from './OnlineInteractions';
import UserInteration from './UserInteraction';

const MODTEMP = process.env.APPDATA + '/Factorio Mod Updater/';
const MODDIR = process.env.APPDATA + '/Factorio/mods/';

type InstallType = 'update' | 'install';

async function InstallMod(mod: Mod, type: InstallType) {

	function clearName(name: string) {
		while (name.includes('%20')) {
			name = name.replace('%20', ' ');
		}
		return name;
	}

	const time = Date.now();
	if (type == 'install') {
		console.log('Installation of ' + chalk.bold(mod.title));
	} else {
		console.log('Updating ' + chalk.bold(mod.title));
	}
	console.log('[1/4] Checking...');
	if (fs.existsSync(MODDIR + mod.name)) {
		ConsoleInteractions.clearLine();
		console.log('Mod already installed');
		return;
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
		fse.moveSync(MODTEMP + 'mod/' + clearName(mod.name), MODDIR + clearName(mod.name));
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

	mod = DataInteraction.Installed.fetchMod(clearName(mod.name));
	if (!CheckModState(mod)) {
		console.log('');
		console.log('❌This mod isn\'t working now.');
		if (await UserInteration.Valid('Would you like to perform a dependency check?')) {
			await HighLevelActions.CheckDependencies(mod);
		}
	}
}

function UninstallMod(mod: Mod) {
	console.log('Uninstalling ' + chalk.bold(mod.title) + '...');
	fs.rmSync(MODDIR + mod.name, { recursive: true, force: true });
	ConsoleInteractions.clearLine();
	console.log('Successfully uninstalled ' + chalk.bold(mod.title));
}

function CheckModState(mod: Mod) {
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
		if (!DataInteraction.Installed.isInstalled(dep.name)) {
			state = false;
		}
	});

	return state;
}

async function CheckDependencies(mod: Mod) {

	const AllDependencies = mod.dependencies;

	if (AllDependencies.length == 0) {
		return;
	}

	const ConflictsDeps: Array<Dependency> = [];
	const RequiredDeps: Array<Dependency> = [];
	const OptionalsDeps: Array<Dependency> = [];
	AllDependencies.forEach(el => {
		if (el.type == 'Conflict') {
			ConflictsDeps.push(el);
		} else if (el.type == 'Required') {
			RequiredDeps.push(el);
		} else {
			OptionalsDeps.push(el);
		}
	});

	// Check conflicts
	const toRemove: Array<any> = [];
	ConflictsDeps.forEach(dep => {
		if (DataInteraction.Installed.isInstalled(dep.name)) {
			const dependency = DataInteraction.Installed.fetchMod(dep.name);
			toRemove.push({ name: dependency.title, value: dependency, checked: true });
		}
	});

	if (toRemove.length != 0) {
		console.log('Theses mods are in ' + chalk.redBright('CONFLICT') + ' with ' + chalk.bold(mod.title));
		const choices: Array<Mod> = await UserInteration.CheckBox('Select mods to remove', toRemove);
		console.log('');
		choices.forEach(UninstallMod);
	}

	// Check required
	let toInstall: Array<any> = [];
	RequiredDeps.forEach(dep => {
		if (!DataInteraction.Installed.isInstalled(dep.name)) {
			toInstall.push(dep);
		}
	});

	if (toInstall.length != 0) {
		let toInstallMods: Array<Mod> = [];
		let i = 0;
		for (let dep of toInstall) {
			console.log('Fetching dependency [' + i + '/' + toInstall.length + ']...');
			const mod = await OnlineInteractions.fetchMod(dep.name);
			ConsoleInteractions.clearLine();
			i++;
			toInstallMods.push(mod);
		}

		toInstall = toInstallMods.map(dep => {
			return { name: dep.title, value: dep, checked: true };
		});

		console.log('Theses mods are ' + chalk.blueBright('REQUIRED') + ' for ' + chalk.bold(mod.title));
		toInstallMods = await UserInteration.CheckBox('Select mods to install', toInstall);
		console.log('');

		i = 0;
		for (let mod of toInstallMods) {
			await InstallMod(mod, 'install');
		}
	}

	// Check optionals
	let toOptInstall: Array<any> = [];
	OptionalsDeps.forEach(dep => {
		if (!DataInteraction.Installed.isInstalled(dep.name)) {
			toOptInstall.push(dep);
		}
	});

	if (toOptInstall.length != 0) {
		const next = await UserInteration.Valid(toOptInstall.length + ' optionals dependencies are available. Do you wanna check them ?', false);

		if (!next) return;

		let toOptInstallMods: Array<Mod> = [];
		let i = 0;
		for (let dep of toOptInstall) {
			console.log('Fetching dependency [' + i + '/' + toOptInstall.length + ']...');
			const mod = await OnlineInteractions.fetchMod(dep.name);
			ConsoleInteractions.clearLine();
			i++;
			toOptInstallMods.push(mod);
		}

		toOptInstall = toOptInstallMods.map(dep => {
			return { name: dep.title, value: dep, checked: true };
		});

		console.log('Theses mods are ' + chalk.blueBright('OPTIONAL') + ' for ' + chalk.bold(mod.title));
		toOptInstallMods = await UserInteration.CheckBox('Select mods to install', toOptInstall);
		console.log('');

		i = 0;
		for (let mod of toOptInstallMods) {
			await InstallMod(mod, 'install');
		}
	}

}

async function UpdateAllMods() {
	const localMods = DataInteraction.Installed.getMods();

	const newMods: Array<Mod> = [];
	let i = 0;
	for (let Mod of localMods) {
		const percentage = parseFloat((i / localMods.length * 100).toFixed(2));
		console.log(`${ConsoleInteractions.ProgressBar((percentage / 5).toFixed(0))} ${percentage.toString()}%`)
		newMods.push(await OnlineInteractions.fetchMod(Mod.name));
		ConsoleInteractions.clearLine();
		i++;
	}

	const upgradeMods: Array<Mod> = [];
	newMods.forEach((newMod, i) => {
		const localMod = localMods[i];
		if (newMod.version != localMod.version) {
			if (upgradeMods.length == 0) {
				console.log('Mods to update :\n');
			}
			console.log(chalk.bold(localMod.title) + ': ' + chalk.gray(localMod.version) + ' -> ' + chalk.underline(newMod.version));
			upgradeMods.push(newMod);
		}
	});
	if (upgradeMods.length == 0) {
		console.log('Mods up to date !');
		return;
	}
	const message = upgradeMods.length == 1 ? 'Update it?' : 'Update them?';

	if (!await UserInteration.Valid(message)) {
		return;
	}

	const time = Date.now();
	console.log('\n');

	for (let mod of upgradeMods) {
		await UpdateMod(mod);
	}

	const newTime = Date.now() - time;
	console.log('Mods updated in ' + (newTime / 1000).toFixed(2) + 's');
}

function IsModUnderDependency(mod: Mod) {
	const modList = DataInteraction.Installed.getMods();
	for (let localMod of modList) {
		for (let dep of localMod.dependencies) {
			if (dep.type == 'Required') {
				if (dep.name == mod.name) {
					const Dep = DataInteraction.Installed.fetchMod(localMod.name);
					return Dep.title;
				}
			}
		}
	}
	return '';
}

async function UpdateMod(mod: Mod) {
	UninstallMod(mod);
	ConsoleInteractions.clearLine();
	await InstallMod(mod, 'update');
}


const HighLevelActions = { CheckDependencies, CheckModState, InstallMod, IsModUnderDependency, UninstallMod, UpdateAllMods, UpdateMod };
export default HighLevelActions;