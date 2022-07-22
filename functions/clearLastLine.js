function clearLastLine(number = 1) {
	for (let i = 0; i < number; i++) {
		process.stdout.moveCursor(0, -1);
		process.stdout.clearLine(1);
	}
}

module.exports = { clearLastLine };