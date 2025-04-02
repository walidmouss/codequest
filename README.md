# Code Quest

This project is a **Machine Learning tool designed to track and analyze your progress on Codeforces**. It provides insights into your problem-solving journey by evaluating metrics such as difficulty counts, topics solved, success rates, and ratings. The project is intended to enhance your training efficiency and help you focus on areas that need improvement.

## Features
- 📊 **Progress Report Generation:** View your performance with detailed statistics such as:
  - Current Rating, Maximum Rating, and Success Rate.
  - Problems solved categorized by difficulty (Easy, Medium, Hard, Undefined).
  - Count of problems solved per topic.
- 🎨 **Styled Console Output:** Beautifully formatted reports using `chalk` and `boxen` for better readability.
- 🔄 **Interactive CLI:** Easily navigate through options with `inquirer` for a smooth experience.
- 📁 **JSON Parsing:** Progress and problems data are read from `progress.json` and other relevant files, making it adaptable to new inputs.

## Technologies Used
- **Node.js**
- **Express.js**
- **chalk** (for colored console output)
- **boxen** (for creating boxed layouts)
- **inquirer** (for interactive CLI)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/walidmouss/codequest.git
   cd codequest
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage
1. Ensure you have your `progress.json` and other necessary JSON files ready in the root directory.
2. Run the project:
   ```bash
   node index.js
   ```
3. Follow the interactive CLI prompts to view your progress report.

## Example Output
```
Progress Report

Handler: your_handler_name
Current Rating: 1500
Maximum Rating: 1700
Success Rate: 75%
Total Problems Solved: 120

Difficulty Count:
Easy: 50
Medium: 45
Hard: 20
Undefined: 5

Topics Solved:
Graphs: 30
DP: 25
Math: 40
Greedy: 25
```

## To-Do
- Implement automatic fetching of data from Codeforces API.
- Enhance visual representation of progress (e.g., graphs).
- Add support for more advanced analysis metrics.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact
Feel free to reach out for collaboration or questions:
- **Email:** walidmoussa00@gmail.com
- **GitHub:** [walidmouss](https://github.com/walidmouss)

---
Happy coding! 🚀

