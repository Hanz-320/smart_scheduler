import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import pickle
import re
# Task Duration Estimator - Predicts how long tasks will take
# Features: task_type, complexity, assignee_skill, description_length, priority
# Target: estimated_hours
def parse_time_to_hours(time_str):
    """Convert time strings like '2h', '30m', '1.5h' to hours"""
    if pd.isna(time_str):
        return np.nan
    
    time_str = str(time_str).lower().strip()
    
    # Match patterns like "2h", "30m", "1.5h", "2.5 hours"
    hours_match = re.search(r'(\d+\.?\d*)\s*h', time_str)
    minutes_match = re.search(r'(\d+\.?\d*)\s*m', time_str)
    days_match = re.search(r'(\d+\.?\d*)\s*d', time_str)
    
    hours = 0
    if days_match:
        hours += float(days_match.group(1)) * 8  # 1 day = 8 work hours
    if hours_match:
        hours += float(hours_match.group(1))
    if minutes_match:
        hours += float(minutes_match.group(1)) / 60
    
    # Default to 2 hours if no pattern matched
    return hours if hours > 0 else 2.0
def extract_features(df):
    """Extract features from task data"""
    features = pd.DataFrame()
    
    # Description length (proxy for complexity)
    features['description_length'] = df['title'].str.len()
    
    # Priority encoding
    priority_map = {'low': 1, 'medium': 2, 'high': 3}
    features['priority_encoded'] = df['priority'].str.lower().map(priority_map).fillna(2)
    
    # Task type (extract from title keywords)
    def categorize_task(title):
        title_lower = str(title).lower()
        if any(word in title_lower for word in ['research', 'investigate', 'analyze']):
            return 'research'
        elif any(word in title_lower for word in ['design', 'wireframe', 'mockup', 'ui', 'ux']):
            return 'design'
        elif any(word in title_lower for word in ['develop', 'code', 'implement', 'build', 'prototype']):
            return 'development'
        elif any(word in title_lower for word in ['test', 'qa', 'bug', 'fix']):
            return 'testing'
        elif any(word in title_lower for word in ['meet', 'review', 'discuss']):
            return 'meeting'
        else:
            return 'other'
    
    features['task_type'] = df['title'].apply(categorize_task)
    
    # Assignee (if available)
    if 'assigned_user' in df.columns:
        features['assignee'] = df['assigned_user'].fillna('Unassigned')
    else:
        features['assignee'] = 'Unassigned'
    
    return features
def train_duration_model():
    """Train the task duration estimation model"""
    print("Loading task data...")
    
    # Load data
    df = pd.read_csv('tasks.csv')
    
    # Parse estimated time to hours
    df['estimated_hours'] = df['estimated_time'].apply(parse_time_to_hours)
    
    # Fill any remaining NaN values with median
    df['estimated_hours'] = df['estimated_hours'].fillna(df['estimated_hours'].median())
    
    # If still have NaN (all were NaN), default to 2 hours
    if df['estimated_hours'].isna().all():
        df['estimated_hours'] = 2.0
    
    if len(df) < 10:
        print(f"⚠️ Warning: Only {len(df)} valid samples. Generating synthetic data for better training...")
        df = generate_synthetic_data(df)
    
    print(f"Training on {len(df)} samples...")
    
    # Extract features
    features = extract_features(df)
    
    # Encode categorical variables
    le_task_type = LabelEncoder()
    le_assignee = LabelEncoder()
    
    features['task_type_encoded'] = le_task_type.fit_transform(features['task_type'])
    features['assignee_encoded'] = le_assignee.fit_transform(features['assignee'])
    
    # Select features for training
    X = features[['description_length', 'priority_encoded', 'task_type_encoded', 'assignee_encoded']]
    y = df['estimated_hours']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model - using Gradient Boosting for better accuracy
    print("Training Gradient Boosting model...")
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n✅ Model Performance:")
    print(f"   Mean Absolute Error: {mae:.2f} hours")
    print(f"   R² Score: {r2:.2f}")
    
    # Save model and encoders
    print("\nSaving model...")
    with open('duration_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    with open('le_task_type.pkl', 'wb') as f:
        pickle.dump(le_task_type, f)
    with open('le_assignee.pkl', 'wb') as f:
        pickle.dump(le_assignee, f)
    
    print("✅ Model saved successfully!")
    
    # Test predictions
    print("\n📊 Sample Predictions:")
    for i in range(min(5, len(X_test))):
        actual = y_test.iloc[i]
        predicted = y_pred[i]
        print(f"   Actual: {actual:.1f}h, Predicted: {predicted:.1f}h (Error: {abs(actual-predicted):.1f}h)")
    
    return model, le_task_type, le_assignee
def generate_synthetic_data(existing_df):
    """Generate synthetic training data based on existing patterns"""
    synthetic_data = []
    
    task_templates = [
        # Research tasks (1-4 hours)
        ("Research user requirements", "high", "2h", "Alice"),
        ("Investigate technical feasibility", "high", "3h", "Charlie"),
        ("Analyze competitor features", "medium", "2.5h", "Alice"),
        ("Study market trends", "low", "1.5h", "Bob"),
        
        # Design tasks (2-6 hours)
        ("Create wireframes", "medium", "3h", "Bob"),
        ("Design UI mockups", "high", "5h", "Bob"),
        ("Build prototype", "high", "6h", "Charlie"),
        ("Design user flow", "medium", "2h", "Bob"),
        
        # Development tasks (4-10 hours)
        ("Implement authentication", "high", "8h", "Charlie"),
        ("Develop API endpoints", "high", "6h", "Charlie"),
        ("Build frontend components", "medium", "5h", "Alice"),
        ("Integrate third-party service", "medium", "4h", "Charlie"),
        
        # Testing tasks (1-3 hours)
        ("Write unit tests", "medium", "2h", "Alice"),
        ("Perform QA testing", "high", "3h", "Bob"),
        ("Fix bugs", "high", "2.5h", "Charlie"),
        ("Code review", "low", "1h", "Alice"),
        
        # Meeting tasks (0.5-2 hours)
        ("Team standup", "low", "0.5h", "Alice"),
        ("Sprint planning", "medium", "2h", "Bob"),
        ("Client review", "high", "1.5h", "Charlie"),
        ("Design review", "medium", "1h", "Bob"),
    ]
    
    for title, priority, time, user in task_templates:
        synthetic_data.append({
            'title': title,
            'priority': priority,
            'estimated_time': time,
            'assigned_user': user
        })
    
    # Combine with existing data
    synthetic_df = pd.DataFrame(synthetic_data)
    
    # Parse synthetic times too
    synthetic_df['estimated_hours'] = synthetic_df['estimated_time'].apply(parse_time_to_hours)
    
    combined_df = pd.concat([existing_df, synthetic_df], ignore_index=True)
    
    return combined_df
if __name__ == "__main__":
    train_duration_model()
