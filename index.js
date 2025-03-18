#!/usr/bin/env node

import { writeFile, readFile } from 'fs/promises';
import inquirer from 'inquirer';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import gradient from 'gradient-string';
import { json } from 'stream/consumers';

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
    },
    {
        type : 'input',
        name : 'solved_mark',
        message : 'Enter the problem ID you solved:',
    }
]

const filePath = './data/problems.json';

// reads json file from data folder to get problems

async function loadProblem(){
    try{
        
        const file = await readFile(filePath, 'utf-8');
        const problems = JSON.parse(file);
        if (problems.length == 0){
            console.log(chalk.yellow("There is no problems in database"));
            return;
        }
        const rand = Math.floor(Math.random() * problems.length);
        console.log(problems[rand]);
    }
    catch(error){
        console.error(chalk.red("error getting file: ", error));
    }
}

//changes the solved status in the chosen problem

async function solved (){
    const answer = await inquirer.prompt(questions[1]);
    try{
        const file = await readFile(filePath , 'utf-8');
        const problem = JSON.parse(file);
        const probid = answer.solved_mark -1  ;
        if (isNaN(probid) || probid < 0 || probid >= problem.length) {
            console.log(chalk.red("Invalid problem ID!"));
            return;
        }
        problem[probid ].solved = true;
        
        await writeFile(filePath, JSON.stringify(problem, null, 2));
        console.log(chalk.green(`Problem ${probid+1} marked as solved! ✅`));
    }
    catch(error){
        console.log("error finding file : ", error);
    }
}

async function ask(){
    const answer = await inquirer.prompt(questions[0]);
    //console.log(`${answer.initial_question}`);
    if(answer.initial_question == "exit        -> Quit CLI" ){
        console.log(chalk.red("Goodbye! 👋"));
        process.exit(0);
    }
    else if(answer.initial_question == "solve       -> Mark a problem as solved"){
        await solved();
        console.log(answer.initial_question);
    }
    else if(answer.initial_question == "get-problem -> Fetch a new problem"){
        await loadProblem();
    }
}


console.log(chalk.green('Welcome to CodeClimber CLI! 🚀 \nYour coding practice companion.'));
console.log(chalk.magenta("\ncommands:"));

ask()