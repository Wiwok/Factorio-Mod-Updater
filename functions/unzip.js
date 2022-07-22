const AdmZip = require('adm-zip');

async function unzip(archivePath, targetPath) {
	return await new Promise(resolve => {
		const zip = new AdmZip(archivePath);
		zip.extractAllTo(targetPath);
		resolve();
	});
}

module.exports = { unzip };