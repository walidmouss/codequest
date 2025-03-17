#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import gradient from 'gradient-string';

const questions = [
    {
        type : 'list',
        name : 'initial_question',
        message : 'commands:',
        choices: [
            "get-problem -> Fetch a new problem",
            "solve       -> Mark a problem as solved",
            "progress    -> View your progress",
            "help        -> Show all commands",
            "exit        -> Quit CLI"
        ],
    }
]

async function ask(){
    const answer = await inquirer.prompt(questions);
    //console.log(`${answer.initial_question}`);
    if(answer.initial_question == "exit        -> Quit CLI" ){
        console.log(chalk.red("Goodbye! 👋"));
        process.exit(0);
    }
}

console.log(chalk.green('Welcome to CodeClimber CLI! 🚀 \nYour coding practice companion.'));
console.log(chalk.magenta("\ncommands:"));


ask();