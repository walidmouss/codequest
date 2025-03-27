import pandas as pd
import numpy as np

# Load data in smaller chunks instead of all at once
chunksize = 100000  # Adjust based on available RAM
chunks = []
total_rows = 0  # Counter for debugging

# Read dataset in chunks
for chunk in pd.read_csv("./dataset.csv", dtype={'problem_id': 'category', 'user_handler': 'category', 'rating': 'int16'}, chunksize=chunksize):
    total_rows += len(chunk)
    
    chunk["topicsExist"] = (chunk["topics"] != "none").astype(np.uint8)
    chunk["ratingExist"] = (chunk["rating"] != 0).astype(np.uint8)

    # Split topics only if necessary
    if chunk["topics"].str.contains(';').any():
        chunk["topics"] = chunk["topics"].str.split(';')
        chunk = chunk.explode('topics')

    # One-hot encode topics efficiently
    chunk = pd.get_dummies(chunk, columns=['topics'], dtype=np.uint8)

    chunks.append(chunk)

print(f"Total rows read: {total_rows}")  # Debugging: Check if all data is read

# Combine all processed chunks
df = pd.concat(chunks, ignore_index=True)

# Aggregate using sum instead of max to prevent data loss
df = df.groupby(['problem_id', 'user_handler'], as_index=False, observed=True).sum()

# Load user data efficiently
user_df = pd.read_csv("./usersData.csv", dtype={'user_handle': 'category', 'maxRating': 'int16'})

# Merge with user data
df_merged = df.merge(user_df, left_on="user_handler", right_on="user_handle", how="inner")

print(f"Total rows after merging: {len(df_merged)}")  # Debugging: Check final row count

# Save progress to avoid recomputation
df_merged.to_csv("merged_data.csv", index=False)

print(df_merged.head())  # Check the output
