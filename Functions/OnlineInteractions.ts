import AdmZip from 'adm-zip';
import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import fse from 'fs-extra';
import https from 'https';

import Mod from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';

const MODTEMP = process.env.APPDATA + '/Factorio Mod Updater/';

const MODURL = 'https://mods.factorio.com/mod';

const DOWNLOADURL = 'https://factorio-launcher-mods.storage.googleapis.com';

function unzipMod() {
	const zip = new AdmZip(MODTEMP + 'mod.zip');
	zip.extractAllTo(MODTEMP + 'zip/', true);
	const name = JSON.parse(fs.readFileSync(MODTEMP + 'zip/' + fs.readdirSync(MODTEMP + 'zip/')[0] + '/info.json').toString())?.name;
	fse.moveSync(MODTEMP + 'zip/' + fs.readdirSync(MODTEMP + 'zip/')[0], MODTEMP + 'mod/' + name);
	fs.rmSync(MODTEMP + 'mod.zip');
}

function checkModExist(name: string) {
	return new Promise<boolean>(resolve => {
		axios.get(MODURL + '/' + name).then(() => {
			resolve(true);
		}).catch(() => {
			resolve(false);
		});
	});
}

async function downloadMod(name: string, version: string) {
	function ProgressBar(progress: string) {
		switch (progress) {
			case '0': return '[>                   ]';
			case '1': return '[=>                  ]';
			case '2': return '[==>                 ]';
			case '3': return '[===>                ]';
			case '4': return '[====>               ]';
			case '5': return '[=====>              ]';
			case '6': return '[======>             ]';
			case '7': return '[=======>            ]';
			case '8': return '[========>           ]';
			case '9': return '[=========>          ]';
			case '10': return '[==========>         ]';
			case '11': return '[===========>        ]';
			case '12': return '[============>       ]';
			case '13': return '[=============>      ]';
			case '14': return '[==============>     ]';
			case '15': return '[===============>    ]';
			case '16': return '[================>   ]';
			case '17': return '[=================>  ]';
			case '18': return '[==================> ]';
			case '19': return '[===================>]';
			case '20': return '[====================]';
		}
	}

	return new Promise<void>((resolve, reject) => {
		https.get(`${DOWNLOADURL}/${name}/${version}.zip`, async response => {
			const code = response.statusCode ?? 0;
			if (code >= 400) {
				reject(new Error(response.statusMessage));
			}
			const fileWriter = fs.createWriteStream(MODTEMP + 'mod.zip')
				.on('finish', () => {
					clearInterval(interval);
					ConsoleInteractions.clearLine();
					resolve();
				});
			const fileSize = parseInt(response.headers['content-length'] as string, 10);
			const downloadSize = fileWriter.bytesWritten;
			const percentage = parseFloat(((downloadSize / fileSize) * 100).toFixed(2));
			console.log(`${ProgressBar((percentage / 10).toFixed(0))} ${percentage.toString()}%`);
			const interval = setInterval(async () => {
				const actualPercentage = parseFloat(((fileWriter.bytesWritten / fileSize) * 100).toFixed(2));
				ConsoleInteractions.clearLine();
				console.log(`${ProgressBar((actualPercentage / 5).toFixed(0))} ${actualPercentage.toString()}%`);
			}, 50);
			response.pipe(fileWriter);
		}).on('error', error => {
			reject(error);
		});
	});
}


async function fetchMod(name: string) {
	return new Promise<Mod>(async (resolve, reject) => {
		const v = await axios.get(`${MODURL}/${name}`);
		const $ = load(v.data);
		//@ts-ignore
		let VersionNumber: string | undefined = $('dd')[5]?.children[0]?.data;
		while (VersionNumber?.includes(' ')) {
			VersionNumber = VersionNumber.replace(' ', '');
		}
		while (VersionNumber?.includes('\n')) {
			VersionNumber = VersionNumber.replace('\n', '');
		}
		// @ts-ignore
		const Author: string | undefined = $('dd')[0].children[0]?.next?.children[0]?.data;
		// @ts-ignore
		const Title: string | undefined = $('a')[8]?.children[0]?.data;
		// @ts-ignore
		const Description: string | undefined = $('p')[0]?.children[0]?.data;
		if ([Title, Author, VersionNumber].includes(undefined)) {
			reject('Internal error: Unable to fetch this mod.');
		}
		// @ts-ignore
		resolve(new Mod(name, Title, VersionNumber, Author, [], Description ?? ''));
	});
}

const OnlineInteractions = { checkModExist, downloadMod, fetchMod, unzipMod };
export default OnlineInteractions;