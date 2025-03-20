import pandas as pd

df = pd.read_csv("./dataset.csv")

#print(df.head())
df = df.drop(columns=["medium_solved", "easy_solved", "hard_solved"])
df['topics'] = df['topics'].str.split('|')
df = df.explode('topics')

df = pd.get_dummies(df, columns=['topics']) # creats a new collumn for each topic that has 1 if topic is there 
df = df.groupby('problem_id', as_index=False).max() # collect rows with similar problem ids

#print(df.head())

print(df.info())  # Check column types & null values
#print(df.describe())  # Summary statistics for numerical columns
#print(df.isnull().sum())  # Count missing values per column
