import { createWriteStream } from 'node:fs';
import { lstat, mkdir, readdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import unzipper from 'unzipper';

import { LocalMod } from '../Classes/Mod';
import exists from '../Tools/exists';

const MODDIR = process.env.APPDATA + '/Factorio/mods/';
const TEMPDIR = process.env.APPDATA + '/Factorio Mod Updater/';

async function clearTemp() {
	try {
		if (await exists(TEMPDIR)) {
			await rm(TEMPDIR, { recursive: true, force: true });
		}
		await mkdir(TEMPDIR, { recursive: true });
		await mkdir(path.join(TEMPDIR, 'mod'), { recursive: true });
		await mkdir(path.join(TEMPDIR, 'zip'), { recursive: true });
		return true;
	} catch {
		return false;
	}
}

async function isModInstalled(name: string) {
	return exists(path.join(MODDIR, name, 'info.json'));
}

async function fetchInstalledMods() {
	const entries = await readdir(MODDIR);

	const mods = await Promise.all(
		entries.map(async v => {
			try {
				if (!(await lstat(path.join(MODDIR, v))).isDirectory()) return null;
				const tempMod = JSON.parse((await readFile(path.join(MODDIR, v, 'info.json'))).toString());
				return new LocalMod(
					tempMod.name,
					tempMod.title,
					tempMod.version,
					tempMod.author,
					tempMod.description,
					tempMod.dependencies
				);
			} catch {
				return null;
			}
		})
	);

	return mods.filter(m => m !== null);
}

async function getMods() {
	const entries = await readdir(MODDIR);
	const withStats = await Promise.all(
		entries.map(v => lstat(path.join(MODDIR, v)).then(stat => ({ v, isDir: stat.isDirectory() })))
	);
	return withStats.filter(({ isDir }) => isDir).map(({ v }) => v);
}

async function getMod(name: string) {
	if (!(await exists(path.join(MODDIR, name)))) {
		return;
	}
	const data = JSON.parse((await readFile(path.join(MODDIR, name, 'info.json'))).toString());
	return new LocalMod(data.name, data.title, data.version, data.author, data.description, data.dependencies);
}

async function getTempMod(name: string) {
	const data = JSON.parse((await readFile(path.join(path.join(TEMPDIR, 'mod', name), 'info.json'))).toString());
	return new LocalMod(data.name, data.title, data.version, data.author, data.description, data.dependencies);
}

async function unzip(name: string, onProgress?: (percent: number, extracted: number, size: number) => void) {
	const extractPath = path.join(TEMPDIR, 'zip', name);
	if (await exists(extractPath)) await rm(extractPath, { recursive: true, force: true });
	await mkdir(extractPath, { recursive: true });

	try {
		const directory = await unzipper.Open.file(path.join(TEMPDIR, name + '.zip'));
		const totalSize = directory.files.reduce((acc, f) => acc + f.uncompressedSize, 0);
		let extracted = 0;
		let lastPercent = -1;

		let lastUpdate = 0;
		const throttledProgress = (ex: number) => {
			if (!onProgress) return;
			const now = Date.now();
			const percent = Math.min(Math.round((ex / totalSize) * 100), 100);
			if (now - lastUpdate < 100 && percent === lastPercent) return;
			lastUpdate = now;
			lastPercent = percent;
			onProgress(percent, ex, totalSize);
		};

		await Promise.all(
			directory.files.map(
				file =>
					new Promise<void>(async (resolve, reject) => {
						const entryPath = path.join(extractPath, file.path);

						if (file.type === 'Directory') {
							await mkdir(entryPath, { recursive: true });
							resolve();
							return;
						}

						await mkdir(path.dirname(entryPath), { recursive: true });

						const writeStream = createWriteStream(entryPath);
						const readStream = file.stream();

						readStream.on('data', (chunk: Buffer) => {
							extracted += chunk.length;
							throttledProgress(extracted);
						});

						writeStream.on('close', resolve);
						writeStream.on('error', reject);
						readStream.on('error', reject);

						readStream.pipe(writeStream);
					})
			)
		);

		const subDir = (await readdir(extractPath))[0];

		await rename(path.join(extractPath, subDir), path.join(TEMPDIR, 'mod', name));
		await rm(path.join(TEMPDIR, name + '.zip'));
		await rm(path.join(extractPath), { recursive: true, force: true });
		return true;
	} catch (err) {
		console.error(err);
		if (await exists(path.join(TEMPDIR, name + '.zip'))) await rm(path.join(TEMPDIR, name + '.zip'));
		return false;
	}
}
const DataInteraction = {
	Installed: {
		fetchMods: fetchInstalledMods,
		isInstalled: isModInstalled,
		getMod: getMod,
		getMods: getMods
	},
	getTempMod,
	clearTemp,
	unzip
};

export default DataInteraction;
