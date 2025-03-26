import fs from "fs/promises";
import path from "path";

const csvHeader = "problem_id,user_handler,rating,topics,attempts,solved,topicsSkill,creationTime\n";

const handlersPath = path.join("./data/handlers.json");
const progressPath = "./data/progress.json";
//const tempDataPath = "./data/tempData.json";
const csvPath = "./ml/dataset.csv";
try {
    await fs.access(csvPath); // Check if file exists
} catch (error) {
    await fs.writeFile(csvPath, csvHeader, "utf-8"); // Only write header if file doesn't exist
}

function formatCSV(problem) {
    return `${problem.problem_id},${problem.user_handler},${problem.rating},"${problem.topics.join(";")}",${problem.attempts},${problem.solved},${problem.topicsSkill},${problem.creationTime}\n`;
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
const batchSize = 5; // Adjust this based on your needs

// Process handlers in batches
for (let i = 0; i < handlersList.length; i += batchSize) {
    const batch = handlersList.slice(i, i + batchSize);

    await Promise.all(
        batch.map(async (placeHolder) => {
            const problemAttempts = {};

            console.log("Sending handler:", placeHolder);
            progress.topicsSolved = {};

            try {
                const response = await fetch("http://localhost:3000/userDetails", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ handler: placeHolder }),
                });

                const problems = await response.json();
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
                    problemAttempts[problemId].creationTime = currentProblem.creationTime;
                    if (!problemAttempts[problemId].rating) problemAttempts[problemId].rating = 0;
                    if (!problemAttempts[problemId].topics || problemAttempts[problemId].topics.length === 0) 
                        problemAttempts[problemId].topics = ["none"];
                }

                const csvRows = Object.values(problemAttempts).map(formatCSV).join("");
                await fs.appendFile(csvPath, csvRows, "utf-8"); // Append new rows

                // Push the final processed data
                //tempData.push(...Object.values(problemAttempts));

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        })
    );

    //await fs.writeFile(tempDataPath, JSON.stringify(tempData, null, 2));

    await delay(500); // ⏳ Wait before starting the next batch
}
