import fs from "fs";
import path from "path";

let csvData = "problem_id,rating,topics,solved,topics skill,easy_solved,medium_solved,hard_solved\n"; // Header row

const progressPath = path.join("./data/progress.json");
const problemsPath = path.join("./data/problems.json");


const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
const problems = JSON.parse(fs.readFileSync(problemsPath, "utf-8"));


problems.forEach(problem => {
    var sumPoints = 0
    var sumCount = 0


    const probid = problem.id
    const rating = problem.rating || "undefined"
    const topics = problem.topics ? problem.topics.join("|") : "unknown";
    const solved = problem.solved === true ? 1 : 0 
    problem.topics.forEach(topic =>{
        if (progress.topicsSolved[topic] !== undefined) {
            sumPoints += progress.topicsSolved[topic]
            sumCount += 1
        }
    })
    const topicsSkill = sumCount > 0 ? sumPoints / sumCount : 0
    const easy = progress.difficultyCount["Easy"];
    const medium = progress.difficultyCount["Medium"];
    const hard = progress.difficultyCount["Hard"];
    csvData += `${probid},${rating},${topics},${solved},${topicsSkill},${easy},${medium},${hard}\n`;
});


const writePath = path.join("./ml/dataset.csv");

fs.writeFileSync(writePath, csvData, "utf-8");

console.log("✅ CSV file created successfully!");