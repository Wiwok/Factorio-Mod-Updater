import inquirer from 'inquirer';
import PromptSync from 'prompt-sync';

const prompt = PromptSync();

type Choice = {
	name: string,
	value: string
}

async function Prompt(message: string): Promise<string> {
	return (await inquirer.prompt({
		name: 'prompt',
		message: message,
		type: 'input'
	})).prompt;
}

async function Valid(message: string): Promise<boolean> {
	return (await inquirer.prompt({
		name: 'valid',
		message: message,
		type: 'confirm'
	})).valid;
}

async function Choices(message: string, choices: Array<Choice>): Promise<string> {
	return (await inquirer.prompt({
		name: 'list',
		message: message,
		choices: choices,
		type: 'list'
	})).list;
}

function GoBackToMenu() {
	console.log('Press enter to go back to the menu...')
	Pause();
}

function Pause() {
	prompt('');
}


const UserInteration = { Prompt, Choices, GoBackToMenu, Pause, Valid };
export default UserInteration;