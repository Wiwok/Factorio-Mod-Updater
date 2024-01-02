import inquirer from 'inquirer';
import PromptSync from 'prompt-sync';

const prompt = PromptSync();

type Choice = {
	name: string;
	value: string;
};

async function Prompt(message: string): Promise<string> {
	return (
		await inquirer.prompt({
			name: 'prompt',
			message: message,
			type: 'input'
		})
	).prompt;
}

async function Valid(message: string, Default: boolean = true): Promise<boolean> {
	return (
		await inquirer.prompt({
			name: 'valid',
			message: message,
			type: 'confirm',
			default: Default
		})
	).valid;
}

async function Choices(message: string, choices: Array<Choice>): Promise<string> {
	return (
		await inquirer.prompt({
			name: 'list',
			message: message,
			choices: choices,
			type: 'list'
		})
	).list;
}

async function CheckBox(message: string, choices: Array<Choice>) {
	return (
		await inquirer.prompt({
			name: 'checkBox',
			message: message,
			choices: choices,
			type: 'checkbox'
		})
	).checkBox;
}

function GoBackToMenu() {
	console.log('Press enter to go back to the menu...');
	Pause();
}

function Pause() {
	prompt('');
}

const UserInteration = { CheckBox, Choices, GoBackToMenu, Pause, Prompt, Valid };
export default UserInteration;
