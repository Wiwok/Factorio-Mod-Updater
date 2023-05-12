import fs from 'fs';

import Mod from '../Classes/Mod';

const MODDIR = process.env.APPDATA + '/Factorio/mods/';
const TEMPDIR = process.env.APPDATA + '/Factorio Mod Updater/';

function clearTempDir() {
	if (fs.existsSync(TEMPDIR)) {
		fs.rmSync(TEMPDIR, { recursive: true, force: true });
	}
	fs.mkdirSync(TEMPDIR);
	fs.mkdirSync(TEMPDIR + 'mod');
	fs.mkdirSync(TEMPDIR + 'zip');
}

function isModInstalled(name: string) {
	const mods: Array<string> = [];
	fs.readdirSync(MODDIR).forEach(v => {
		if (fs.lstatSync(MODDIR + v).isDirectory()) {
			mods.push(v);
		}
	});

	return mods.includes(name);
}

function getInstalledMods() {
	const mods: Array<Mod> = [];
	fs.readdirSync(MODDIR).forEach(v => {
		if (fs.lstatSync(MODDIR + v).isDirectory()) {
			const tempMod = JSON.parse(fs.readFileSync(MODDIR + v + '/info.json').toString());
			const mod = new Mod(tempMod.name, tempMod.title, tempMod.version, tempMod.author, tempMod?.dependencies, tempMod?.description);
			mods.push(mod);
		}
	});
	return mods;
}

function fetchInstalledMod(name: string) {
	if (!fs.existsSync(MODDIR + name)) {
		console.log('Internal error: Mod not found.');
		return;
	}
	const data = JSON.parse(fs.readFileSync(MODDIR + name + '/info.json').toString());
	return new Mod(data.name, data.title, data.version, data.author, data?.dependencies);
}


const DataInteraction = {
	Installed: {
		getMods: getInstalledMods,
		isInstalled: isModInstalled,
		fetchMod: fetchInstalledMod
	},
	clearTemp: clearTempDir
};
export default DataInteraction;