import fs from "fs/promises";
import path from "path";

const csvHeader = "problem_id,user_handler,rating,topics,attempts,solved,topicsSkill,creationTime\n";


const handlersPath = path.join("./data/handlers.json");
const progressPath = "./data/progress.json";
const tempDataPath = "./data/tempData.json";
const csvPath = "./ml/dataset.csv";
await fs.writeFile(csvPath, csvHeader, "utf-8");  // Overwrite old file

function formatCSV(problem) {
    return `${problem.problem_id},${problem.user_handler},${problem.rating},"${problem.topics.join(";")}",${problem.attempts},${problem.solved},${problem.topicsSkill},${problem.creationTime}\n`;
}


// Read data files
const [handlers, progressFile, tempDataFile] = await Promise.all([
    fs.readFile(handlersPath, "utf-8"),
    fs.readFile(progressPath, "utf-8"),
    fs.readFile(tempDataPath, "utf-8"),
]);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const handlersList = JSON.parse(handlers);
const progress = JSON.parse(progressFile);
const tempData = JSON.parse(tempDataFile);


// Fetch user details and process problems
for (let i = 0; i < handlersList.length; i++) {
    let placeHolder = handlersList[i];
    const problemAttempts = {}

    console.log("Sending handler:", placeHolder);
    progress.topicsSolved = {};
    //await fs.writeFile(progressPath, JSON.stringify(progress, null, 2));
    

    try {
        const response = await fetch("http://localhost:3000/userDetails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handler: placeHolder }),
        });

        const problems = await response.json();
        var submissionCount = 0
        for (let j = 0; j < problems.length; j++) {
            let currentProblem = problems[j];
            let problemId = currentProblem.id;
            let skillPoints = 0;
            let topicsCount = 0;


            if (!problemAttempts[problemId]) {
                problemAttempts[problemId] = {
                    problem_id: problemId,
                    user_handler: placeHolder,
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
            problemAttempts[problemId].creationTime = currentProblem.creationTime
    
        }

        
        const csvRows = Object.values(problemAttempts).map(formatCSV).join("");
        await fs.appendFile(csvPath, csvRows, "utf-8");  // Append new rows

    } catch (error) {
        console.error("Error fetching data:", error);
    }

    await delay(500); // ⏳ Wait 500ms before the next request
    // Push the final processed data
    tempData.push(...Object.values(problemAttempts));

    await fs.writeFile(tempDataPath, JSON.stringify(tempData, null, 2));
}