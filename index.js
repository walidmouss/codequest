#!/usr/bin/env node

import { writeFile, readFile } from 'fs/promises';
import inquirer from 'inquirer';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import gradient from 'gradient-string';
import { json } from 'stream/consumers';
import axios from 'axios';
import open from 'open';



import fs from "fs/promises";
import path from 'path'
import {exec} from 'child_process'
import { fileURLToPath } from 'url';


const cachePath = './data/cacheFile.json'
const recommendProblemPath = './data/recommended.json'



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
        

    },
    {
        type : 'text',
        name : 'login',
        message : "Please enter your codeforces handler ... if you don't have a codeforces account please create one"

    }
]

const filePath = './data/problems.json';
const ProgressPath = './data/progress.json'

// reads json file from data folder to get problems

async function  login(){
    const ans = await inquirer.prompt(questions[7])
    const handler = ans.login
    console.log("Sending handler:", handler);
    console.log("please wait for a few seconds ...");
    await fetch("http://localhost:3000/handlerFullData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handler })
    })
    .then(response => {
        return response.json();
    })
    .then(data => {
        /*console.log(" Response:", data);*/
    })
    .catch(error => console.error("there was an error logging in:", error));

    
    const progressPath = "./data/progress.json";
    const progressFile = await fs.readFile(progressPath, "utf-8");
    const progress = JSON.parse(progressFile);
    
    const recommendProblemFile = await fs.readFile(recommendProblemPath, "utf-8");
    let recommendProblem = JSON.parse(recommendProblemFile);
    recommendProblem = []
    
    const file3 = await readFile(cachePath , 'utf-8');
    const cacheFile = JSON.parse(file3);

    cacheFile.forEach(p =>{

        
        const strongTopics = Object.entries(progress.topicsSolved)
        .sort((a, b) => b[1] - a[1]) // sort by count descending
        .slice(0, 3); // take the top 3
        //console.log("top 3 topics:", strongTopics);


        const weakTopics = Object.entries(progress.topicsSolved)
        .filter(([topic, attempts]) => attempts >= 3) // Ignore rare topics
        .sort((a, b) => a[1] - b[1]) // sort by count descending
        .slice(0, 3); // take the top 3
        //console.log("weakest 3 topics:", weakTopics);
        
        var topicsPoints = 0
        var topicsCounter = 0
        var topicsSkillPoints = 0
        if(p.tags){
            p.tags.forEach(topic =>{
                if(progress.topicsSolved[topic]){
                    topicsPoints += progress.topicsSolved[topic]
                }
                topicsCounter ++
            })
            topicsSkillPoints = topicsPoints / topicsCounter
        }
        
        const problem = {
            problem_id: `${p.contestId}-${p.index}` ,
            user_handler: progress.handler,
            rating: p.rating ?? 0,
            topics: p.tags ? p.tags.join(',') : ["none"], //make sure this is a string not an array
            attempts: 0,
            solved : false,
            topicsSkill: topicsSkillPoints,
            creationTime: undefined,
            problem_ratingAvailable: p.rating && p.rating != 0 ? true : false,
            problem_topicsAvailable: p.tags.length == 0 ? false : true,
            user_currentRating: progress.current_rating,
            user_maxRating: progress.maximum_rating,
            user_successRate: parseFloat(Number(progress.successRate).toFixed(2)),
            user_strongTopics: strongTopics.map(([topic]) => topic).join(';'),
            user_weakTopics: weakTopics.map(([topic]) => topic).join(';'),
            user_easy: progress.difficultyCount["Easy"],
            user_medium: progress.difficultyCount["Medium"],
            user_hard: progress.difficultyCount["Hard"],
            user_ratingNotAvailable: progress.difficultyCount["undefined"],
            prediction : 0
        }
        recommendProblem.push(problem)

    })
    await fs.writeFile(recommendProblemPath, JSON.stringify(recommendProblem, null, 4));
    console.log("Problems formatted successfully! Sending response...");
        
    console.log("Problems formatted successfully!");

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////makePrediction/////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath =path.join(__dirname, './ml/predict.py')


    exec(`python ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error.message}`);
            res.status(500).send('Error executing prediction script.');
            return;
        }
        if (stderr) {
            console.error(`Error output: ${stderr}`);
            res.status(500).send('Prediction script ran with errors.');
            return;
        }
        console.log(`Output: ${stdout}`);
        console.log('Prediction script executed successfully!');
    });

    ask()
}

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
        //console.log("DEBUG: Problem Object ->", unsolvedProbs[i]);


        while(i<unsolvedProbs.length){
            let [contestId, index] = unsolvedProbs[i].problem_id.split("-");
            console.log(chalk.blue("ID:               "), unsolvedProbs[i].problem_id);
            console.log(chalk.cyan("Difficulty:       "), unsolvedProbs[i].rating == 0 ? "Rating not available" : unsolvedProbs[i].rating );
            console.log(chalk.green("URL:             "), `https://codeforces.com/contest/${contestId}/problem/${index}`);
            console.log(chalk.green("Topics:          "), unsolvedProbs[i].topics.length > 0 ? unsolvedProbs[i].topics : "No topics");
            console.log(chalk.green("solvability:     "), unsolvedProbs[i].prediction);

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

    const file2 = await readFile(filePath, 'utf-8');
    const problems = JSON.parse(file2);

    const progressPath = "./data/progress.json";
    const progressFile = await fs.readFile(progressPath, "utf-8");
    const progress = JSON.parse(progressFile);
    
    const recommendProblemFile = await fs.readFile(recommendProblemPath, "utf-8");
    let recommendProblem = JSON.parse(recommendProblemFile);

    const file3 = await readFile(cachePath , 'utf-8');
    const cacheFile = JSON.parse(file3);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////populatePrediction//////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const predictionPath = "./data/predictions.json";
    const predictionFile = await fs.readFile(predictionPath, "utf-8");
    const prediction = JSON.parse(predictionFile);

    for(let i=0 ; i<prediction.length ; i++){
        recommendProblem[i].prediction = prediction[i]
    }
    recommendProblem.sort((a, b) => b.prediction - a.prediction);
    await fs.writeFile(recommendProblemPath, JSON.stringify(recommendProblem, null, 4));

    console.log("population completed successfully!");
    
    const problemsPath = './data/problems.json'
    const file = await readFile(problemsPath , 'utf-8');
    const problemsFile = JSON.parse(file);


    const problemIds = new Set(
        problemsFile
            .filter(problem => problem.solved === true) // Only include solved problems
            .map(problem => problem.problem_id) // Extract their IDs
    );

    
    const filteredProblems = recommendProblem.filter(problem => 
        problem.prediction >= 0.5 &&
        problem.prediction <= 0.75 &&
        !problemIds.has(problem.id) &&
        problem.topics.length > 0
    );
    
    
    const randomNumber = Math.floor(Math.random() * filteredProblems.length);
    let currProblem = filteredProblems[randomNumber]

    let [contestId, index] = currProblem.problem_id.split("-");
    console.log(chalk.bold(chalk.yellow("\nHere is your recommended problem:")));
    console.log("ID:                                     " , currProblem.problem_id);
    //console.log("Title:      " , newProblem.data.title);
    console.log("Difficulty:                             " , currProblem.rating == 0 ? "Rating not available!" : currProblem.rating);
    console.log("URL:                                    " , `https://codeforces.com/contest/${contestId}/problem/${index}`);
    console.log("Problem topics:                         " , currProblem.topics.length > 0 ? currProblem.topics : "Topics not specified by website");
    console.log("\n");
    
    const attempt = await inquirer.prompt(questions[2])
    if(attempt.attempt_request == "Yes" ){
        console.log(chalk.green("Great ... problem marked as attempting"))
        problems.push(currProblem);
        await writeFile(filePath, JSON.stringify(problems, null, 2));

        
        console.log(chalk.green("🌐 Redirecting you to Codeforces... ")) 
        await goToLink(`https://codeforces.com/contest/${contestId}/problem/${index}`);
    }
    else{
        const sure = await inquirer.prompt(questions[3])
        if(sure.anotherOne == "Yes"){
            addProblem()
        }
        if(sure.anotherOne == "No"){
            ask();
        }
    }
    
}

//changes the solved status in the chosen problem

async function solved (){
    try{
        // read and parse problems.json
        const file = await readFile(filePath , 'utf-8');
        const problem = JSON.parse(file);

        // read and parse progress.json
        const file2 = await readFile(ProgressPath , 'utf-8');
        const progress = JSON.parse(file2);

        console.log(chalk.underline(chalk.grey("note that the last problem id attempted was :" , problem[problem.length-1].id)));
        console.log(chalk.magenta("To exit type 'exit' "));
        
        // what problem do you want to mark as solved
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
        if(temp.solved == true){
            console.log(chalk.green("you have already solved this problem ^_^ "))
            ask()
        }
        else{
            //mark changes in progress
            progress.totalSolved ++;
            temp.topics.forEach(topic => {
                if(progress.topicsSolved[topic]){
                    progress.topicsSolved[topic]++;
                } else {
                    progress.topicsSolved[topic] = 1;
                }
            });
            temp.solved = true;
            temp.solvedAt = Date.now();

            progress.difficultyCount[temp.difficulty]++;

            // write changes to json files
            await writeFile(filePath, JSON.stringify(problem, null, 2));
            await writeFile(ProgressPath , JSON.stringify(progress , null , 2));
            console.log(chalk.green(`Problem ${probid} marked as solved! ✅\n`));
            ask();
        }
            
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

login()