import axios from "axios";
import express from "express";

const app = express();
app.use(express.json());

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


app.listen(3000, () => console.log("Server running on port 3000"));