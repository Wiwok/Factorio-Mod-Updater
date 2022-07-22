const https = require('https');
const fs = require('fs');

const { clearLastLine } = require('./clearLastLine');

async function download(url, targetFile) {
	return await new Promise((resolve, reject) => {
		https.get(url, response => {
			const code = response.statusCode ?? 0;
			if (code >= 400) {
				return reject(new Error(response.statusMessage));
			}
			if (code > 300 && code < 400 && !!response.headers.location) {
				return download(response.headers.location, targetFile);
			}
			const fileWriter = fs.createWriteStream(targetFile)
				.on('finish', () => {
					clearLastLine();
					resolve({});
				});
			const fileSize = parseInt(response.headers['content-length'], 10);
			const fileSizeMo = (fileSize / 1000000).toFixed(2);
			const downloadSize = fileWriter.bytesWritten;
			console.log(`Downloading... ${(downloadSize / 1000000).toFixed(2)}Mo / ${(fileSize / 1000000).toFixed(2)}Mo [${((downloadSize / fileSize) * 100).toFixed(2)}%]`);
			response.on('data', () => {
				const downloadedSize = fileWriter.bytesWritten;
				const message = `Downloading... ${(fileWriter.bytesWritten / 1000000).toFixed(2)}Mo / ${fileSizeMo}Mo [${((downloadedSize / fileSize) * 100).toFixed(2)}%]`;
				clearLastLine();
				console.log(message);
			});
			response.pipe(fileWriter);
		}).on('error', error => {
			reject(error);
		});
	});
}


module.exports = { download };