import pandas as pd
import numpy as np

# Load your data from CSV and store it in a dataframe (df)
df = pd.read_csv('dataset.csv')


# Remove rows where the problem_id starts with 'undefined'
df = df[~df['problem_id'].str.startswith('undefined')]
df['solved'] = df['solved'].astype(int) #make sure that the solved collumn is in int form and not bool


# Convert topics , weaktopics , strongtopics to categorical IDs for lightGBM to understand
df['topics'] = df['topics'].astype('category').cat.codes
df['user_strongTopics'] = df['user_strongTopics'].astype('category').cat.codes
df['user_weakTopics'] = df['user_weakTopics'].astype('category').cat.codes

#telling lightGBM which features are categorial so it could act accordingly
categorical_features = ['topics', 'user_strongTopics', 'user_weakTopics']

df.to_csv('cleaned_data.csv', index=False)  # 'index=False' prevents pandas from adding an extra index column (primary key)

print("Cleaned data saved to 'cleaned_data.csv'.")