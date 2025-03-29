import fs from "fs/promises";
import path from "path";
import axios from "axios";

const csvHeader = "problem_id,user_handler,rating,topics,attempts,solved,topicsSkill,creationTime\n";
const userCsvHeader = "user_handler,currentRating,maxRating,successRate,strongTopics,weakTopics,easy,medium,hard,ratingNotAvailable\n";


const handlersPath = path.join("./data/handlers.json");
const progressPath = "./data/progress.json";


//const tempDataPath = "./data/tempData.json";
const csvPath = "./ml/dataset.csv";
const filePath ="./ml/usersData.csv";


try {
    await fs.access(csvPath); // Check if file exists
} catch (error) {
    await fs.writeFile(csvPath, csvHeader, "utf-8"); // Only write header if file doesn't exist
}

try {
    await fs.access(filePath); // Check if file exists
} catch (error) {
    await fs.writeFile(filePath, userCsvHeader, "utf-8"); // Create file with header
}


function formatCSV(entry) {
    return `${entry.problem_id},${entry.user_handler},${entry.rating},"${entry.topics}",${entry.attempts},${entry.solved},${entry.topicsSkill},${entry.creationTime},${entry.problem_ratingAvailable},${entry.problem_topicsAvailable},${entry.user_currentRating},${entry.user_maxRating},${entry.user_successRate},"${entry.user_strongTopics.join(";")}","${entry.user_weakTopics.join(";")}",${entry.user_easy},${entry.user_medium},${entry.user_hard},${entry.user_ratingNotAvailable}\n`;
}

function formatUserCSV(user) {
    return `${user.user_handler},${user.currentRating},${user.maxRating},${user.successRate},"${user.strongTopics.join(";")}","${user.weakTopics.join(";")}",${user.difficultyStats.easy},${user.difficultyStats.medium},${user.difficultyStats.hard},${user.difficultyStats.ratingNotAvailable}\n`;
}


// Read data files
const [handlers, progressFile,/* tempDataFile*/] = await Promise.all([
    fs.readFile(handlersPath, "utf-8"),
    fs.readFile(progressPath, "utf-8"),
   // fs.readFile(tempDataPath, "utf-8"),
]);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const handlersList = JSON.parse(handlers);
const progress = JSON.parse(progressFile);
//const tempData = JSON.parse(tempDataFile);

// Batch processing
const batchSize = 2; // Adjust this based on your needs

// Process handlers in batches
for (let i = 0; i < handlersList.length; i += batchSize) {
    const batch = handlersList.slice(i, i + batchSize);

    await Promise.all(
        batch.map(async (placeHolder) => {

            console.log("Sending handler:", placeHolder);
            
            var total_no_of_trials = 0
            const problemAttempts = {};
            progress.topicsSolved = {};

            try {
                const response = await fetch("http://localhost:3000/userDetails", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ handler: placeHolder }),
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
                            user_handler: placeHolder,
                            rating: currentProblem.rating,
                            topics: currentProblem.topics,
                            attempts: 0,
                            solved: false,
                            //ratingAvailable : true,
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

                //const csvRows = Object.values(problemAttempts).map(formatCSV).join("");
                //await fs.appendFile(csvPath, csvRows, "utf-8"); // Append new rows

                //Push the final processed data
                //tempData.push(...Object.values(problemAttempts));

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


            const response = await axios.get(
                `https://codeforces.com/api/user.info?handles=${placeHolder}&checkHistoricHandles=false`
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

            /*
            const userData = {
                user_handler : placeHolder,
                currentRating : currentData.rating ?? 0,
                maxRating : currentData.maxRating ?? 0,
                successRate : successRate.toFixed(2),
                weakTopics: weakTopics.map(([topic]) => topic), 
                strongTopics: strongTopics.map(([topic]) => topic),
                difficultyStats : difficultyStats,
            }
*/
            const finalRow = Object.values(problemAttempts).map(p => ({
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
                user_successRate: successRate.toFixed(2),
                user_strongTopics: strongTopics.map(([topic]) => topic),
                user_weakTopics: weakTopics.map(([topic]) => topic),
                user_easy: difficultyStats.easy,
                user_medium: difficultyStats.medium,
                user_hard: difficultyStats.hard,
                user_ratingNotAvailable: difficultyStats.ratingNotAvailable,
            }));

            //console.log(finalRow)

            const dataset = finalRow.map(formatCSV).join(""); // Convert each object to a CSV row
            await fs.appendFile(csvPath, dataset, "utf-8"); // Append all rows to the file

        })
    );

    //////////////////////////////////////user details part //////////////////////////////////////////////


    await delay(500); // ⏳ Wait before starting the next batch
}

