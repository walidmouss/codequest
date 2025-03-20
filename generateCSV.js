import fs from "fs";
import path from "path";

let csvData = "problem_id,rating,topics,solved\n"; // Header row

const progressPath = path.join("./data/progress.json");
const problemsPath = path.join("./data/problems.json");


const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
const problems = JSON.parse(fs.readFileSync(problemsPath, "utf-8"));


problems.forEach(problem => {
    const probid = problem.id
    const rating = problem.rating || "undefined"
    const topics = problem.topics ? problem.topics.join("|") : "unknown";
    const solved = problem.solved === true ? 1 : 0 

    
    csvData += `${probid},${rating},${topics},${solved}\n`;
});



const writePath = path.join("./ml/dataset.csv");

fs.writeFileSync(writePath, csvData, "utf-8");

console.log("✅ CSV file created successfully!");