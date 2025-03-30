import pandas as pd
import json
import lightgbm as lgb
import os

# 1. Load the saved LightGBM model
def load_model():
    model = lgb.Booster(model_file=os.path.join(os.getcwd(), 'ml', 'trained_model.txt'))
    return model

# 2. Read the input data from a JSON file
def load_input_data(file_path):
    with open(file_path, 'r') as file:
        input_data = json.load(file)
        df = pd.DataFrame(input_data)
        X = df.drop(['solved', 'problem_id', 'user_handler', 'creationTime', 'attempts', 'prediction'], axis=1, errors='ignore')
        
        # Define categorical features
        categorical_features = ['topics', 'user_strongTopics', 'user_weakTopics']
        
        # Convert categorical columns to numerical IDs and mark as 'category'
        for feature in categorical_features:
            X[feature], _ = pd.factorize(X[feature])
            X[feature] = X[feature].astype('category')
        
        print(X.dtypes)  # Check column types to confirm categorical types are set
        return X

# 3. Make predictions using the loaded model
def make_predictions(model, input_data):
    # LightGBM expects the input to be a DataFrame with the same columns as during training
    predictions = model.predict(input_data)
    return predictions

# 4. Output the predictions as JSON
def save_predictions(predictions, output_file):
    with open(output_file, 'w') as file:
        json.dump(predictions.tolist(), file)

if __name__ == '__main__':
    # Load the model
    model = load_model()

    # Load input data
    input_data = load_input_data('./data/recommended.json')

    # Make predictions
    predictions = make_predictions(model, input_data)

    # Save predictions to a JSON file
    save_predictions(predictions, './data/predictions.json')

    print("Predictions saved successfully!")
