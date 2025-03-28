import pandas as pd
from sklearn.model_selection import train_test_split
import lightgbm as lgb
from sklearn.metrics import accuracy_score, roc_auc_score, log_loss


df = pd.read_csv('cleaned_data.csv')


# let lightGBM know which features are categorical
categorical_features = ['topics' , 'user_strongTopics' , 'user_weakTopics']

#print(df[['topics', 'user_strongTopics', 'user_weakTopics']].dtypes)

y = df['solved']
X = df.drop(['solved' , 'problem_id' , 'user_handler'], axis=1) # dropped the problemid and handler because model wont learn from them


#this splits data to 4 parts ... 2 for test and 2 for training
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

#giving lgb the data needed to start trainig and storing them in 1 place
train_data = lgb.Dataset(X_train , label=y_train , categorical_feature= categorical_features)
test_data = lgb.Dataset(X_test, label=y_test, categorical_feature=categorical_features, reference=train_data)


params = {
    'objective': 'binary', #either solved = 0 or solved = 1
    'metric': 'binary_logloss', #measures model performance
    'boosting_type': 'gbdt', # gradient boosting decision tree
    'learning_rate': 0.05,
    'num_leaves': 31,
    'feature_pre_filter': False # making this false ensures lgb doesnt ignore categorical features
}

model = lgb.train(
    params,             # The parameters dictionary we defined earlier
    train_data,         # The training data formatted as a LightGBM Dataset
    num_boost_round=100  # The number of boosting iterations the more rounds the more accuracy
)

y_pred_prob = model.predict(X_test) # predict if user will solve the problem and gives probability between 0 and 1
y_pred = [1 if prob > 0.5 else 0 for prob in y_pred_prob] # rounds prediction to either 0 or 1


accuracy = accuracy_score(y_test, y_pred) # measures how many predictions i got right
auc = roc_auc_score(y_test, y_pred_prob)
loss = log_loss(y_test, y_pred_prob)

# Print evaluation metrics
print(f"Accuracy: {accuracy * 100:.2f}%") # gets me the accuracy of model as percentage to 2 decimal places
print(f"AUC: {auc:.4f}")
print(f"Log Loss: {loss:.4f}")


# Save the model to a file
model.save_model('trained_model.txt')
lgb.Booster(model_file='trained_model.txt')

print("saved and loaded model successfully ^_^")