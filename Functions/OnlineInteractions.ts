import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import https from 'https';

import Mod from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';

const MODTEMP = process.env.APPDATA + '/Factorio Mod Updater/';

const MODURL = 'https://mods.factorio.com/mod';

const DOWNLOADURL = 'https://factorio-launcher-mods.storage.googleapis.com';

function downloadMod(name: string, version: string) {
	function ProgressBar(progress: string) {
		switch (progress) {
			case '0': return '[>         ]';
			case '1': return '[=>        ]';
			case '2': return '[==>       ]';
			case '3': return '[===>      ]';
			case '4': return '[====>     ]';
			case '5': return '[=====>    ]';
			case '6': return '[======>   ]';
			case '7': return '[=======>  ]';
			case '8': return '[========> ]';
			case '9': return '[=========>]';
			case '10': return '[==========]';
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
			console.log(`Downloading... ${ProgressBar((percentage / 10).toFixed(0))} ${percentage.toString()}%`);
			const interval = setInterval(async () => {
				const actualPercentage = parseFloat(((fileWriter.bytesWritten / fileSize) * 100).toFixed(2));
				const message = `Downloading... ${ProgressBar((actualPercentage / 10).toFixed(0))} ${actualPercentage.toString()}%`;
				ConsoleInteractions.clearLine();
				console.log(message);
			}, 50);
			response.pipe(fileWriter);
		}).on('error', error => {
			reject(error);
		});
	});
}


function fetchMod(name: string) {
	return new Promise(resolve => {
		axios.get(`${MODURL}/${name}`).then(v => {
			const $ = load(v.data);

			//@ts-ignore
			let VersionNumber: string = $('dd')[5]?.children[0]?.data;
			while (VersionNumber.includes(' ')) {
				VersionNumber = VersionNumber.replace(' ', '');
			}
			while (VersionNumber.includes('\n')) {
				VersionNumber = VersionNumber.replace('\n', '');
			}

			// @ts-ignore
			const Author: string = $('dd')[0].children[0]?.next?.children[0]?.data;

			// @ts-ignore
			const Title: string = $('a')[8]?.children[0]?.data;

			// @ts-ignore
			const Description: string = $('p')[0]?.children[0]?.data

			resolve(new Mod(name, Title, VersionNumber, Author, [], Description ?? ''));
		});
	});
}

const OnlineInteractions = { downloadMod, fetchMod };
export default OnlineInteractions;