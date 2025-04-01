import axios from "axios";
import express from "express";
import { readFile , writeFile } from 'fs/promises';
import fs from "fs/promises";
import path from 'path'
import {exec} from 'child_process'
import { fileURLToPath } from 'url';




const app = express();
app.use(express.json());


const cachePath = './data/cacheFile.json'
const recommendProblemPath = './data/recommended.json'

app.get("/randProblem" , async (req,res) =>{

    try{
        const response = await axios.get("https://codeforces.com/api/problemset.problems", {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        
        
        const AllProblems = response.data.result;
        var randid = Math.floor(Math.random() * AllProblems.problems.length);
        const currentProblem = AllProblems.problems[randid];
        var solvedCount = null
        if(currentProblem.contestId != null){
            solvedCount = AllProblems.problemStatistics.find(p => 
                p.contestId == currentProblem.contestId
                && p.index === currentProblem.index
            )
            solvedCount = solvedCount.solvedCount;

            /*const contests =  await axios.get(`https://codeforces.com/api/contest.standings?contestId=${currentProblem.contestId}&asManager=false&from=1&count=5&showUnofficial=true`);
            res.json(contests.data);*/

        }
        const formattedProblem = {
            id :`${currentProblem.contestId}-${currentProblem.index}` ,
            title: currentProblem.name,
            difficulty: currentProblem.rating ? // original difficulty of the question
                (currentProblem.rating < 1600 ? "Easy" : currentProblem.rating < 2000 ? "Medium" : "Hard") 
                : "Unknown",
            rating : currentProblem.rating,
            url: `https://codeforces.com/contest/${currentProblem.contestId}/problem/${currentProblem.index}`,
            topics :currentProblem.tags ,
            solved: false,
            solvedCount:solvedCount,
            solvedAt : null
        };
        res.json(formattedProblem);

    }catch(error){
        console.log("Error fetching problems:", error.response ? error.response.data : error.message);
        res.status(500).json({error: "Failed to fetch problems", details: error.response ? error.response.data : error.message});
    }
})

///////////////////////////this is the sbumissions details not user detail ////////////////
app.post("/userDetails", async (req, res) => {
    const { handler } = req.body;



    try {
        const response = await axios.get(
            `https://codeforces.com/api/user.status?handle=${handler}`
        );

        const problems = response.data.result;
        var probRating = 0
        var problemCount = 0
        const questionsList = []
        problems.forEach(question => {
            //if(question.verdict == "OK" || question.verdict == "PARTIAL" ){
                const formattedProblem = {
                    id :`${question.problem.contestId}-${question.problem.index}` ,
                    title: question.problem.name,
                    creationTime : question.creationTimeSeconds,
                    difficulty: question.problem.rating ? // original difficulty of the question
                        (question.problem.rating < 1600 ? "Easy" : question.problem.rating < 2000 ? "Medium" : "Hard") 
                        : "Unknown",
                    rating : question.problem.rating,
                    url: `https://codeforces.com/contest/${question.problem.contestId}/problem/${question.problem.index}`,
                    topics :question.problem.tags ,
                    solved: question.verdict == "OK"? true : false ,
                    solvedAt : null
                };
                
                questionsList.push(formattedProblem);
                /*
                problemsFile.push(formattedProblem)
                if (question.problem.rating) { 
                    if(question.problem.rating <1600){
                        progress.difficultyCount["Easy"]++
                    }else if(question.problem.rating <2000){
                        progress.difficultyCount["Medium"]++
                    }else{
                        progress.difficultyCount["Hard"]++
                    }
                    probRating += question.problem.rating;
                    problemCount ++
                }else{
                    progress.difficultyCount["undefined"]++

                }
                progress.totalSolved ++;
                question.problem.tags.forEach(topic => {
                    if(progress.topicsSolved[topic]){
                        progress.topicsSolved[topic]++;
                    } else {
                        progress.topicsSolved[topic] = 1;
                    }
                });
            }*/
        });
        questionsList.sort((a, b) => a.creationTime - b.creationTime);

        //var avgCount = problemCount > 0 ? probRating / problemCount : 0;
        //await writeFile(ProgressPath , JSON.stringify(progress , null , 2));
        //await writeFile(problemsPath, JSON.stringify(problemsFile, null, 2));

        res.json(questionsList); 
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Failed to fetch user data" });
    }
});

app.post("/fetchDataset" , async(req,res)=>{

    
    const handlersPath = './data/handlers.json'
    const file3 = await readFile(handlersPath , 'utf-8');
    const handlersFile = JSON.parse(file3);


    try{
        const response = await axios.get(
            `https://codeforces.com/api/contest.list?gym=true`
        );
        const contests = response.data.result.slice(0, 500).map(contest => contest.id);

        let allHandles = new Set(handlersFile)
        
        for (let i = 0; i < contests.length; i += 5) {
            const batch = contests.slice(i, i + 5).map(async contestId => {
                try {
                    const response2 = await axios.get(
                        `https://codeforces.com/api/contest.standings?contestId=${contestId}&asManager=false&from=1&count=500&showUnofficial=true`
                    );

                    const contest = response2.data.result;
                    contest.rows.forEach(row => {
                        row.party.members.forEach(member => {
                            allHandles.add(member.handle);
                        });
                    });

                } catch (error) {
                    console.error(`Failed to fetch contest ${contestId}:`, error.message);
                }
            });

            await Promise.all(batch);
        }
        const updatedHandlers = [...allHandles];
        await writeFile(handlersPath, JSON.stringify(updatedHandlers, null, 2));

        res.json({ message: "Handlers fetched successfully", count: updatedHandlers.length });

    } catch (error) {
        res.status(500).json({ error: "Couldn't get contest data" });
    }
});

var userRating = 0

app.post("/handlerData" , async(req,res)=>{
    const { handler } = req.body;
    
    const response = await axios.get(
        `https://codeforces.com/api/user.info?handles=${handler}&checkHistoricHandles=false`
    );
    const currentData = response.data.result[0]
    const userData = {
        currentRating : currentData.rating,
        maxRating : currentData.maxRating
    }
    res.json(userData);
    //const response = await axios get(``)
})


//we're using this frequently after we've trained the model
app.post("/handlerFullData" , async(req,res)=>{

    const progressPath = "./data/progress.json";
    const progressFile = await fs.readFile(progressPath, "utf-8");
    const progress = JSON.parse(progressFile);
    
    const { handler } = req.body;
    
    const problemsPath = './data/problems.json'
    const file = await readFile(problemsPath , 'utf-8');
    const problemsFile = JSON.parse(file);


    
    var total_no_of_trials = 0
    const problemAttempts = {};

    try {
        const response = await fetch("http://localhost:3000/userDetails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handler: handler }),
        });

        const problems = await response.json();
        for (let j = 0; j < problems.length; j++) {
            total_no_of_trials++
            let currentProblem = problems[j];
            let problemId = currentProblem.id;
            let skillPoints = 0;
            let topicsCount = 0;

            if (!problemAttempts[problemId]) {
                problemAttempts[problemId] = {
                    problem_id: problemId,
                    user_handler: handler,
                    rating: currentProblem.rating,
                    topics: currentProblem.topics,
                    attempts: 0,
                    solved: false,
                };
            }

            problemAttempts[problemId].attempts++; // Count each submission
            if (currentProblem.solved) {
                problemAttempts[problemId].solved = true; // Keep only final result

                problemAttempts[problemId].topics.forEach(topic => {
                    skillPoints += (progress.topicsSolved[topic] || 0);
                    topicsCount++;
                    progress.topicsSolved[topic] = (progress.topicsSolved[topic] || 0) + 1;
                });
            }

            // Compute average skill points for this problem
            problemAttempts[problemId].topicsSkill = topicsCount > 0 ? skillPoints / topicsCount : 0;
            problemAttempts[problemId].creationTime = currentProblem.creationTime;
            if (!problemAttempts[problemId].rating){
                problemAttempts[problemId].rating = 0;
                problemAttempts[problemId].ratingNotAvailable = false
            }
            if (!problemAttempts[problemId].topics || problemAttempts[problemId].topics.length === 0) 
                problemAttempts[problemId].topics = ["none"];
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    }

    let difficultyStats = { easy: 0, medium: 0, hard: 0, ratingNotAvailable:0 };
    Object.values(problemAttempts).forEach(p => { 
        if(p.rating <= 1400 && p.rating != 0)
            difficultyStats["easy"] ++
        else if(p.rating <= 1800 && p.rating != 0)
            difficultyStats["medium"] ++
        else if(p.rating > 1800)
            difficultyStats["hard"] ++
        else
            difficultyStats["ratingNotAvailable"] ++
    });

    // here we're going to get user data such as current rating
    const response = await axios.get(
        `https://codeforces.com/api/user.info?handles=${handler}&checkHistoricHandles=false`
    );
    const currentData = response.data.result[0]

    //console.log(difficultyStats);

    const strongTopics = Object.entries(progress.topicsSolved)
    .sort((a, b) => b[1] - a[1]) // sort by count descending
    .slice(0, 3); // take the top 3
    //console.log("top 3 topics:", strongTopics);


    const weakTopics = Object.entries(progress.topicsSolved)
    .filter(([topic, attempts]) => attempts >= 3) // Ignore rare topics
    .sort((a, b) => a[1] - b[1]) // sort by count descending
    .slice(0, 3); // take the top 3
    //console.log("weakest 3 topics:", weakTopics);
    
      
    
    
    const successRate = Object.keys(problemAttempts).length / total_no_of_trials
    //console.log("successRate: " , successRate*100 )

    const finalData = Object.values(problemAttempts).map(p => ({
        problem_id: p.problem_id,
        user_handler: p.user_handler,
        rating: p.rating,
        topics: p.topics,
        attempts: p.attempts,
        solved: p.solved,
        topicsSkill: p.topicsSkill,
        creationTime: p.creationTime,
        problem_ratingAvailable: p.rating == 0 ? false : true,
        problem_topicsAvailable: p.topics.length == 1 && p.topics[0] == "none" ? false : true,
        user_currentRating: currentData.rating ?? 0,
        user_maxRating: currentData.maxRating ?? 0,
        user_successRate: Number(successRate.toFixed(2)),
        user_strongTopics: strongTopics.map(([topic]) => topic),
        user_weakTopics: weakTopics.map(([topic]) => topic),
        user_easy: difficultyStats.easy,
        user_medium: difficultyStats.medium,
        user_hard: difficultyStats.hard,
        user_ratingNotAvailable: difficultyStats.ratingNotAvailable,
    }));
    progress.handler = handler
    progress.totalSolved = Object.keys(problemAttempts).length
    progress.successRate = successRate.toFixed(2)
    progress.difficultyCount["Easy"] = difficultyStats.easy
    progress.difficultyCount["Medium"] = difficultyStats.medium
    progress.difficultyCount["Hard"] = difficultyStats.hard
    progress.difficultyCount["undefined"] = difficultyStats.ratingNotAvailable
    progress.maximum_rating = currentData.maxRating ?? 0
    progress.current_rating = currentData.rating ?? 0

    problemsFile.push(...finalData);// push the contents of finalData into problems file
    await writeFile(problemsPath, JSON.stringify(problemsFile, null, 2));
    await writeFile(progressPath, JSON.stringify(progress, null, 2));
    res.json(finalData)

})

app.post( "/allProblems" , async (req,res)=>{

    try {
        const response = await axios.get(
            ` https://codeforces.com/api/problemset.problems`
        );

        if (response.data.status === 'OK') {
            await writeFile(cachePath, JSON.stringify(response.data.result.problems, null, 2));
            res.status(200).send('problems cached successfully!');
        } else {
            res.status(500).send('failed to fetch problems');
        }
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send(`Error fetching data: ${error.message}`);
    }

})

app.get( "/formatProblems" , async(req,res)=>{


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
        
    res.status(200).send("Problems formatted successfully!");
    console.log("Response sent successfully.");

})

app.get("/makePrediction" , async (req , res)=>{
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath =path.join(__dirname, './ml/predict.py')

    
    const recommendProblemFile = await fs.readFile(recommendProblemPath, "utf-8");
    const recommendProblem = JSON.parse(recommendProblemFile);


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
        res.send('Prediction script executed successfully!');
    });
    
//AFTER EXECUTING THIS IT WILL GIVE YOU AN ERROR IGNORE IT 

})


app.get("/populatePrediction" , async (req , res)=>{


    const predictionPath = "./data/predictions.json";
    const predictionFile = await fs.readFile(predictionPath, "utf-8");
    const prediction = JSON.parse(predictionFile);


    const recommendProblemFile = await fs.readFile(recommendProblemPath, "utf-8");
    const recommendProblem = JSON.parse(recommendProblemFile);

    for(let i=0 ; i<prediction.length ; i++){
        recommendProblem[i].prediction = prediction[i]
    }
    recommendProblem.sort((a, b) => b.prediction - a.prediction);
    await fs.writeFile(recommendProblemPath, JSON.stringify(recommendProblem, null, 4));

    res.send("population completed successfully!");
})


app.post("/returnProblem" , async (req , res)=>{

    
    const problemsPath = './data/problems.json'
    const file = await readFile(problemsPath , 'utf-8');
    const problemsFile = JSON.parse(file);

    const recommendProblemFile = await fs.readFile(recommendProblemPath, "utf-8");
    const recommendProblem = JSON.parse(recommendProblemFile);


    const problemIds = new Set(problemsFile.map(problem => problem.problem_id));
    //Filter recommendedProblems (between 0.6 and 0.7 and not attempted)

    const filteredProblems = recommendProblem.filter(problem => 
        problem.prediction >= 0.5 &&
        problem.prediction <= 0.75 &&
        !problemIds.has(problem.id)
    );
    
    
    const randomNumber = Math.floor(Math.random() * filteredProblems.length);
    
    res.json(filteredProblems[randomNumber])

})

app.listen(3000, () => console.log("Server running on port 3000"));