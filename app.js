import axios from "axios";
import express from "express";

const app = express();
app.use(express.json());

app.get("/randProblem" , async (req,res) =>{

    try{
        const response = await axios.get("https://codeforces.com/api/problemset.problems");
        const problems = response.data.result.problems;
        var randid = Math.floor(Math.random() * problems.length);
        const currentProblem = problems[randid];
        const formattedProblem = {
            id :`${currentProblem.contestId}-${currentProblem.index}` ,
            title: currentProblem.name,
            difficulty: currentProblem.rating ? 
                (currentProblem.rating < 1600 ? "Easy" : currentProblem.rating < 2000 ? "Medium" : "Hard") 
                : "Unknown",
            url: `https://codeforces.com/contest/${currentProblem.contestId}/problem/${currentProblem.index}`,
            solved: false
        };
        res.json(formattedProblem);

    }catch(error){
        res.status(500).json({error:"failed to fetch problems" , error});
    }

})


app.listen(3000, () => console.log("Server running on port 3000"));