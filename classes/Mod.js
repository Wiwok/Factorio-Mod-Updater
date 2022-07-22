class Mod {
	constructor(name, author, rawName, version, lastUpdate, creation, downloads, imageURL) {
		this.name = name;
		this.author = author;
		this.rawName = rawName;
		this.version = version;
		this.lastUpdate = lastUpdate;
		this.creation = creation;
		this.downloads = downloads;
		this.image = imageURL;
	}
}

module.exports = { Mod };