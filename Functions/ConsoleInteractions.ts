function clearLine(number: number = 1) {
	for (let i = 0; i < number; i++) {
		process.stdout.moveCursor(0, -1);
		process.stdout.clearLine(1);
	}
}

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}Ko`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}Mo`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}Go`;
}

const ConsoleInteractions = { clearLine, formatSize };
export default ConsoleInteractions;
