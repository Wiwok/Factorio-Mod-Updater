import { confirm, select } from '@inquirer/prompts';
import PromptSync from 'prompt-sync';

const prompt = PromptSync();

type Choice<T> = {
	value: T;
	name?: string;
	description?: string;
	short?: string;
	disabled?: boolean | string;
};

async function Valid(message: string, Default: boolean = true) {
	return confirm({
		message: message,
		default: Default
	});
}

async function Choices<T>(message: string, choices: Array<Choice<T>>) {
	return select({
		message: message,
		choices: choices
	});
}

function GoBackToMenu() {
	console.log('Press enter to go back to the menu...');
	Pause();
}

function Pause() {
	prompt('');
}

const UserInteraction = { Choices, GoBackToMenu, Pause, Valid };
export default UserInteraction;
