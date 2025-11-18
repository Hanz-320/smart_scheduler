import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import pickle

def train_assignment_model():
    """Train the task assignment model"""
    print("Loading task data for assignment model...")
    
    # Load data
    df = pd.read_csv('ml_model/tasks_dataset.csv')
    
    # Drop rows with missing 'assigned_user'
    df.dropna(subset=['assigned_user'], inplace=True)
    
    if len(df) < 10:
        print(f"⚠️ Warning: Only {len(df)} valid samples. Model may not be accurate.")
        return

    print(f"Training on {len(df)} samples...")
    
    # Extract features
    features = pd.DataFrame()
    
    # Encode categorical variables
    le_task_type = LabelEncoder()
    features['task_type_encoded'] = le_task_type.fit_transform(df['task_type'])
    
    le_complexity = LabelEncoder()
    features['complexity_encoded'] = le_complexity.fit_transform(df['complexity'])
    
    # Target variable
    le_assignee = LabelEncoder()
    y = le_assignee.fit_transform(df['assigned_user'])
    
    # Select features for training
    X = features[['task_type_encoded', 'complexity_encoded']]
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Train model
    print("Training Random Forest Classifier model...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n✅ Model Performance:")
    print(f"   Accuracy: {accuracy:.2f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le_assignee.classes_, zero_division=0))
    
    # Save model and encoders
    print("\nSaving model...")
    with open('assignment_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    with open('le_assignee_assignment.pkl', 'wb') as f:
        pickle.dump(le_assignee, f)
    with open('le_task_type_assignment.pkl', 'wb') as f:
        pickle.dump(le_task_type, f)
    
    print("✅ Assignment model saved successfully!")
    
    return model, le_assignee, le_task_type

if __name__ == "__main__":
    train_assignment_model()
