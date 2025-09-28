import AdmZip from 'adm-zip';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync } from 'fs';
import { moveSync } from 'fs-extra';

import Mod from '../Classes/Mod';

const MODDIR = process.env.APPDATA + '/Factorio/mods/';
const TEMPDIR = process.env.APPDATA + '/Factorio Mod Updater/';

function clearTempDir() {
	try {
		if (existsSync(TEMPDIR)) {
			rmSync(TEMPDIR, { recursive: true, force: true });
		}
		mkdirSync(TEMPDIR);
		mkdirSync(TEMPDIR + 'mod');
		mkdirSync(TEMPDIR + 'zip');
		return true;
	} catch (err) {
		return false;
	}
}

function clearName(name: string) {
	while (name.includes('%20')) {
		name = name.replace('%20', ' ');
	}
	return name;
}

function isModInstalled(name: string) {
	return existsSync(MODDIR + clearName(name) + '/info.json');
}

function getInstalledMods() {
	const mods: Array<Mod> = [];
	readdirSync(MODDIR).forEach(v => {
		try {
			if (lstatSync(MODDIR + v).isDirectory()) {
				const tempMod = JSON.parse(readFileSync(MODDIR + v + '/info.json').toString());
				const mod = new Mod(
					tempMod.name,
					tempMod.title,
					tempMod.version,
					tempMod.author,
					tempMod?.dependencies,
					tempMod?.description
				);
				mods.push(mod);
			}
		} catch {}
	});
	return mods;
}

function fetchInstalledMod(name: string) {
	name = clearName(name);
	if (!existsSync(MODDIR + name)) {
		return;
	}
	const data = JSON.parse(readFileSync(MODDIR + name + '/info.json').toString());
	return new Mod(data.name, data.title, data.version, data.author, data?.dependencies, data?.description);
}

function getModsList() {
	return readdirSync(MODDIR).filter(mod => {
		if (existsSync(MODDIR + mod + '/info.json')) return mod;
	});
}

function unzip() {
	try {
		new AdmZip(TEMPDIR + 'mod.zip').extractAllTo(TEMPDIR + 'zip/', true);
		const name = JSON.parse(
			readFileSync(TEMPDIR + 'zip/' + readdirSync(TEMPDIR + 'zip/')[0] + '/info.json').toString()
		)?.name;
		moveSync(TEMPDIR + 'zip/' + readdirSync(TEMPDIR + 'zip/')[0], TEMPDIR + 'mod/' + name);
		rmSync(TEMPDIR + 'mod.zip');
		return true;
	} catch (err) {
		if (existsSync(TEMPDIR + 'mod.zip')) {
			rmSync(TEMPDIR + 'mod.zip');
		}

		rmdirSync(TEMPDIR + 'zip');
		mkdirSync(TEMPDIR + 'zip');

		return false;
	}
}

const DataInteraction = {
	Installed: {
		getMods: getInstalledMods,
		getList: getModsList,
		isInstalled: isModInstalled,
		fetchMod: fetchInstalledMod
	},
	clearTemp: clearTempDir,
	unzip,
	clearName
};

export default DataInteraction;
