#!/usr/bin/env node

import { writeFile, readFile } from 'fs/promises';
import inquirer from 'inquirer';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import gradient from 'gradient-string';
import { json } from 'stream/consumers';
import axios from 'axios';
import open from 'open';

const questions = [
    {
        type : 'list',
        name : 'initial_question',
        message : 'How could we help you ?',
        choices: [
            "Get a recommended problem",
            "View unsolved problems",
            "Mark a problem as solved",
            "View your progress",
            "Exit"
        ],
    },
    {
        type : 'input',
        name : 'solved_mark',
        message : 'Enter the problem ID you solved:',
    },
    {
        type : 'list',
        name : 'attempt_request',
        message : 'Do you want to attempt this problem?',
        choices: [
            "Yes",
            "No"
        ],
    },
    {
        type : 'list',
        name : 'anotherOne',
        message : 'No worries! Want a different recommendation?',
        choices: [
            "Yes",
            "No"
        ]
    },
    {
        type : 'list',
        name : 'editRecommendations',
        message : "🤔 Why are you skipping problems?(we're asking you this in order to refine our recommendation system)",
        choices:[
            "Too difficult",
            "Not interested in this topic",
            "Already solved a similar problem",
            "Other"
        ]
    },
    {
        type : 'list',
        name : 'retry',
        message : "Would you like to retry an unsolved problem?",
        choices:[
            "Yes",
            "No"
        ]
        

    },
    {
        type : 'list',
        name : 'exit',
        message : "Here are all the unsolved problems. How do you want to proceed? ",
        choices:[
            "Go back to main menu",
            "Exit"
        ]
        

    }
]

const filePath = './data/problems.json';

// reads json file from data folder to get problems

async function loadProblem(){
    try{
        const file = await readFile(filePath, 'utf-8');
        const problems = JSON.parse(file);
        if (problems.length == 0){
            console.log(chalk.yellow("There is no unsolved problems in database"));
            return;
        }
        const unsolvedProbs = await problems.filter(p => !p.solved);
        var i = 0;
        console.log("DEBUG: Problem Object ->", unsolvedProbs[i]);

        while(i<unsolvedProbs.length){
            console.log(chalk.blue("ID:         "), unsolvedProbs[i].id);
            console.log(chalk.magenta("Title:      "), unsolvedProbs[i].title);
            console.log(chalk.cyan("Difficulty: "), unsolvedProbs[i].difficulty);
            console.log(chalk.green("URL:        "), unsolvedProbs[i].url);
            console.log(chalk.green("Topics:     "), unsolvedProbs[i].topics ? unsolvedProbs[i].topics.join(", ") : "No topics");

            console.log("\n---------------------------------------------");
            i++;
        }
        const answer = await inquirer.prompt(questions[6])
        if(answer.exit == "Go back to main menu"){
            console.log("\n");
            ask();
        }
        else{
            console.log(chalk.red("Goodbye! 👋"));
            process.exit(0);
        }
    }
    catch(error){
        console.error(chalk.red("error getting file: ", error));
    }
}
async function goToLink(url){
    await open(url);
}
async function addProblem(){
    try{
        const file = await readFile(filePath, 'utf-8');
        const problems = JSON.parse(file);
        
        const newProblem = await axios.get("http://localhost:3000/randProblem");
        console.log(chalk.bold(chalk.yellow("\nHere is your recommended problem:")));
        console.log("ID:         " , newProblem.data.id);
        console.log("Title:      " , newProblem.data.title);
        console.log("Difficulty: " , newProblem.data.difficulty);
        console.log("URL         " , newProblem.data.url);
        console.log("\n");
        const attempt = await inquirer.prompt(questions[2])
        if(attempt.attempt_request == "Yes" ){
            console.log(chalk.green("Great ... problem marked as attempting"))
            problems.push(newProblem.data);
            await writeFile(filePath, JSON.stringify(problems, null, 2));

            
            console.log(chalk.green("🌐 Redirecting you to Codeforces... ")) 
            await goToLink(newProblem.data.url);
        }
        else{
            const sure = await inquirer.prompt(questions[3])
            if(sure.anotherOne == "Yes"){
                console.log(chalk.bold(chalk.yellow("\nHere is another recommended problem:")));
                const newProblem = await axios.get("http://localhost:3000/randProblem");
                console.log("ID:         " , newProblem.data.id);
                console.log("Title:      " , newProblem.data.title);
                console.log("Difficulty: " , newProblem.data.Difficulty);
                console.log("URL         " , newProblem.data.url);
                console.log("\n");
                const attempt = await inquirer.prompt(questions[2])
                if(attempt.attempt_request == "Yes" ){
                    console.log(chalk.green("Great ... problem marked as attempting"))
                    console.log(chalk.green("🌐 Redirecting you to Codeforces... ")) 
                    problems.push(newProblem.data);
                    await writeFile(filePath, JSON.stringify(problems, null, 2));
                    await goToLink(newProblem.data.url);
                }
                else{
                    const skip = await inquirer.prompt(questions[4])
                }
            }
            if(sure.anotherOne == "No"){
                ask();
            }
        }
    }
    catch(error){
        console.log("error adding new problem : " + error);
    }
}

//changes the solved status in the chosen problem

async function solved (){
    try{
        const file = await readFile(filePath , 'utf-8');
        const problem = JSON.parse(file);
        console.log(chalk.underline(chalk.grey("note that the last problem id attempted was :" , problem[problem.length-1].id)));
        console.log(chalk.magenta("To exit type 'exit' "));
        const answer = await inquirer.prompt(questions[1]);
        const probid = answer.solved_mark  ;
        const temp = await problem.find(p => p.id == answer.solved_mark);
        if (!problem ) {
            console.log(chalk.red("Problem not found!"));
            solved();
        }
        if ( answer.solved_mark == "exit") {
            ask();
            return;
        }
        temp.solved = true;
        await writeFile(filePath, JSON.stringify(problem, null, 2));
        console.log(chalk.green(`Problem ${probid} marked as solved! ✅\n`));
        ask();
    }
    catch(error){
        console.log("error finding file : ", error);
    }
}


async function progress(){
    try{
    const file = await readFile(filePath, 'utf-8');
    const problems = JSON.parse(file);
    if (problems.length === 0) {
        console.log(chalk.red("No problems found."));
        return;
    }
    const solvedCount = await problems.filter(p => p.solved);
    const easy = await solvedCount.filter(p => p.difficulty == "Easy").length;
    const medium = await solvedCount.filter(p => p.difficulty == "Medium").length;
    const hard = await solvedCount.filter(p => p.difficulty == "Hard").length;
    const unsolvedCount = problems.length - solvedCount.length ;

    console.log(`📊 Progress Report:  
        total problems attempted ${problems.length}  
        ❌ Unsolved: ${unsolvedCount}
        ✅ Solved:   ${solvedCount.length}  
        Here is the difficulty of problems solved
        🟢 Easy: ${easy} | 🔵 Medium: ${medium} | 🔴 Hard: ${hard}`);
    const answer = await inquirer.prompt(questions[5]);
    if(answer.retry == "Yes"){
        loadProblem();
    }
    else{
        ask();
    }
    } catch (error) {
        console.error(chalk.red("Error reading file:", error));
    }
}

async function ask(){
    const answer = await inquirer.prompt(questions[0]);
    //console.log(`${answer.initial_question}`);
    if(answer.initial_question == "Exit" ){
        console.log(chalk.red("Goodbye! 👋"));
        process.exit(0);
    }
    else if(answer.initial_question == "Mark a problem as solved"){
        await solved();
        console.log(answer.initial_question);
    }
    else if(answer.initial_question == "Get a recommended problem"){
        await addProblem();
    }
    else if(answer.initial_question == "View unsolved problems"){
        await loadProblem();
    }
    else if(answer.initial_question == "View your progress"){
        await progress();
    }
}


console.log(chalk.green('Welcome to CodeClimber CLI! 🚀 \nYour coding practice companion.'));
console.log(chalk.magenta("\ncommands:"));

ask()