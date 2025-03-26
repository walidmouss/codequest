import axios from "axios";
import express from "express";
import { readFile , writeFile  } from 'fs/promises';


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

///////////////////////////this is the sbumissions details not user detail ////////////////
app.post("/userDetails", async (req, res) => {
    const { handler } = req.body;


    const ProgressPath = './data/progress.json'
    const file2 = await readFile(ProgressPath , 'utf-8');
    const progress = JSON.parse(file2);

    
    const problemsPath = './data/problems.json'
    const file = await readFile(problemsPath , 'utf-8');
    const problemsFile = JSON.parse(file);
    

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

app.listen(3000, () => console.log("Server running on port 3000"));