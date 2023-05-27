import AdmZip from 'adm-zip';
import fs from 'fs';
import fse from 'fs-extra';

import Mod from '../Classes/Mod';


const MODDIR = process.env.APPDATA + '/Factorio/mods/';
const TEMPDIR = process.env.APPDATA + '/Factorio Mod Updater/';

function clearTempDir() {
	try {
		if (fs.existsSync(TEMPDIR)) {
			fs.rmSync(TEMPDIR, { recursive: true, force: true });
		}
		fs.mkdirSync(TEMPDIR);
		fs.mkdirSync(TEMPDIR + 'mod');
		fs.mkdirSync(TEMPDIR + 'zip');
		return true;
	} catch (err) {
		return false;
	}
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

function getModsList() {
	const mods = fs.readdirSync(MODDIR).filter(mod => {
		if (fs.lstatSync(MODDIR + '/' + mod).isDirectory()) return mod;
	});
	return mods;
}

function unzipMod() {
	try {
		const zip = new AdmZip(TEMPDIR + 'mod.zip');
		zip.extractAllTo(TEMPDIR + 'zip/', true);
		const name = JSON.parse(fs.readFileSync(TEMPDIR + 'zip/' + fs.readdirSync(TEMPDIR + 'zip/')[0] + '/info.json').toString())?.name;
		fse.moveSync(TEMPDIR + 'zip/' + fs.readdirSync(TEMPDIR + 'zip/')[0], TEMPDIR + 'mod/' + name);
		fs.rmSync(TEMPDIR + 'mod.zip');
		return true;
	} catch (err) {
		if (fs.existsSync(TEMPDIR + 'mod.zip')) {
			fs.rmSync(TEMPDIR + 'mod.zip');
		}

		fs.rmdirSync(TEMPDIR + 'zip');
		fs.mkdirSync(TEMPDIR + 'zip');

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
	unzip: unzipMod
};
export default DataInteraction;