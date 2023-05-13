import chalk from 'chalk';
import fs from 'fs';
import fse from 'fs-extra';

import Mod from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';
import DataInteraction from './DataInteraction';
import OnlineInteractions from './OnlineInteractions';
import UserInteration from './UserInteraction';

const MODTEMP = process.env.APPDATA + '/Factorio Mod Updater/';
const MODDIR = process.env.APPDATA + '/Factorio/mods/';

type InstallType = 'update' | 'install';

async function InstallMod(mod: Mod, type: InstallType) {
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
	if (!await OnlineInteractions.checkModExist(mod.name)) {
		ConsoleInteractions.clearLine();
		console.log('Mod not found');
		return;
	}
	ConsoleInteractions.clearLine();
	console.log('[2/4] Downloading...');
	await OnlineInteractions.downloadMod(mod.name, mod.version);
	ConsoleInteractions.clearLine();
	console.log('[3/4] Unzipping...');
	OnlineInteractions.unzipMod();
	ConsoleInteractions.clearLine();
	console.log('[4/4] Installing...');
	fse.moveSync(MODTEMP + 'mod/' + mod.name, MODDIR + mod.name);
	ConsoleInteractions.clearLine();
	ConsoleInteractions.clearLine();
	const timeNow = Date.now() - time;
	console.log(chalk.bold(mod.title) + ' installed in ' + (timeNow / 1000).toFixed(2) + 's');
}

function UninstallMod(mod: Mod) {
	console.log('Uninstalling ' + chalk.bold(mod.title) + '...');
	fs.rmSync(MODDIR + mod.name, { recursive: true, force: true });
	ConsoleInteractions.clearLine();
	console.log('Successfully uninstalled ' + chalk.bold(mod.title));
}

async function UpdateAllMods() {
	const localMods = DataInteraction.Installed.getMods();

	const newMods: Array<Mod> = [];
	let i = 0;
	for (let Mod of localMods) {
		console.log('Fetching mods... [' + (i + 1) + '/' + localMods.length + ']');
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

async function UpdateMod(mod: Mod) {
	if (!await OnlineInteractions.checkModExist(mod.name)) {
		console.log('Mod not found');
		return;
	}

	UninstallMod(mod);
	ConsoleInteractions.clearLine();
	await InstallMod(mod, 'update')
}


const HighLevelActions = { InstallMod, UninstallMod, UpdateAllMods, UpdateMod };
export default HighLevelActions;