import fs from "fs/promises";
import path from "path";

const handlersPath = path.join("./data/handlers.json");
const progressPath = "./data/progress.json";
const tempDataPath = "./data/tempData.json";
const csvPath = "./ml/dataset.csv";

// Read data files
const [handlers, progressFile, tempDataFile] = await Promise.all([
    fs.readFile(handlersPath, "utf-8"),
    fs.readFile(progressPath, "utf-8"),
    fs.readFile(tempDataPath, "utf-8"),
]);

const handlersList = JSON.parse(handlers);
const progress = JSON.parse(progressFile);
const tempData = JSON.parse(tempDataFile);

let csvData = "problem_id,user_handler,rating,topics,solved\n"; // Header row

// Fetch user details and process problems
for (let i = 0; i < handlersList.length; i++) {
    let placeHolder = handlersList[i];
    console.log("Sending handler:", placeHolder);

    try {
        const response = await fetch("http://localhost:3000/userDetails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handler: placeHolder }),
        });

        const problems = await response.json();

        for (let j = 0; j < problems.length; j++) {
            let currentProblem = problems[j];
            let skillPoints = 0;
            let topicsCount = 0;

            const entry = {
                problem_id: currentProblem.id,
                user_handler: placeHolder,
                rating: currentProblem.rating,
                topics: currentProblem.topics,
                solved: currentProblem.solved,
            };

            tempData.push(entry);
        }

        // Write updated temp data
        await fs.writeFile(tempDataPath, JSON.stringify(tempData, null, 2));

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Convert tempData to CSV format
tempData.forEach((entry) => {
    csvData += `${entry.problem_id},${entry.user_handler},${entry.rating},"${entry.topics.join("|")}",${entry.solved}\n`;
});

// Write CSV file
await fs.writeFile(csvPath, csvData, "utf-8");

console.log("✅ CSV file created successfully!");
