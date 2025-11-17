"""
ML Model Training Script for Smart Scheduler
Trains a Random Forest model to assign tasks to team members based on:
- Task type (design, development, testing, documentation, etc.)
- Task complexity (1-10 scale)
- Required skill level (junior, mid, senior)
- Current workload (low, medium, high)
"""

import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

# ===================================
# 1️⃣ GENERATE SAMPLE TRAINING DATA
# ===================================
def create_sample_dataset():
    """Generate a realistic sample dataset for training if it doesn't exist."""
    print("📊 Creating sample training dataset...")
    
    # Define possible values
    task_types = ["Design", "Frontend", "Backend", "Testing", "Documentation", "DevOps"]
    skill_levels = ["Junior", "Mid", "Senior"]
    workloads = ["Low", "Medium", "High"]
    team_members = ["Alice", "Bob", "Charlie", "Diana", "Eve"]
    
    # Generate synthetic data
    np.random.seed(42)
    n_samples = 200
    
    data = {
        "task_type": np.random.choice(task_types, n_samples),
        "complexity": np.random.randint(1, 11, n_samples),  # 1-10
        "user_skill": np.random.choice(skill_levels, n_samples),
        "workload": np.random.choice(workloads, n_samples),
        "assigned_user": np.random.choice(team_members, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Add some logic-based rules to make it realistic
    # Senior devs get more complex backend tasks
    backend_idx = df[df["task_type"] == "Backend"].index
    df.loc[backend_idx, "complexity"] = df.loc[backend_idx, "complexity"].apply(lambda x: min(x + 3, 10))
    df.loc[backend_idx, "user_skill"] = df.loc[backend_idx, "user_skill"].apply(
        lambda x: "Senior" if np.random.random() > 0.3 else x
    )
    
    # Testing tasks assigned to QA specialists
    testing_idx = df[df["task_type"] == "Testing"].index
    df.loc[testing_idx, "assigned_user"] = np.random.choice(["Charlie", "Eve"], len(testing_idx))
    
    df.to_csv("tasks_dataset.csv", index=False)
    print(f"✅ Created {n_samples} training samples in tasks_dataset.csv")
    return df

# ===================================
# 2️⃣ LOAD AND PREPARE DATA
# ===================================
def load_and_prepare_data():
    """Load training data and handle missing values."""
    print("\n📂 Loading dataset...")
    
    # Check if tasks_dataset.csv exists, otherwise create it
    if not os.path.exists("tasks_dataset.csv"):
        df = create_sample_dataset()
    else:
        df = pd.read_csv("tasks_dataset.csv")
        print(f"✅ Loaded {len(df)} samples from tasks_dataset.csv")
    
    # Handle missing values
    df = df.dropna()
    
    print(f"📊 Dataset shape: {df.shape}")
    print(f"\nDataset preview:")
    print(df.head(10))
    print(f"\nUnique values:")
    print(f"  Task Types: {df['task_type'].unique()}")
    print(f"  Skill Levels: {df['user_skill'].unique()}")
    print(f"  Workloads: {df['workload'].unique()}")
    print(f"  Team Members: {df['assigned_user'].unique()}")
    
    return df

# ===================================
# 3️⃣ ENCODE CATEGORICAL FEATURES
# ===================================
def encode_features(df):
    """Convert categorical features to numerical values."""
    print("\n🔄 Encoding categorical features...")
    
    le_task_type = LabelEncoder()
    le_skill = LabelEncoder()
    le_workload = LabelEncoder()
    le_user = LabelEncoder()
    
    df_encoded = df.copy()
    df_encoded["task_type"] = le_task_type.fit_transform(df["task_type"])
    df_encoded["user_skill"] = le_skill.fit_transform(df["user_skill"])
    df_encoded["workload"] = le_workload.fit_transform(df["workload"])
    df_encoded["assigned_user"] = le_user.fit_transform(df["assigned_user"])
    
    print("✅ Encoding complete")
    print(f"  Task Type classes: {dict(zip(le_task_type.classes_, le_task_type.transform(le_task_type.classes_)))}")
    print(f"  Skill Level classes: {dict(zip(le_skill.classes_, le_skill.transform(le_skill.classes_)))}")
    print(f"  Workload classes: {dict(zip(le_workload.classes_, le_workload.transform(le_workload.classes_)))}")
    print(f"  Team Member classes: {dict(zip(le_user.classes_, le_user.transform(le_user.classes_)))}")
    
    return df_encoded, le_task_type, le_skill, le_workload, le_user

# ===================================
# 4️⃣ TRAIN MODEL
# ===================================
def train_model(X_train, y_train, X_test, y_test):
    """Train Random Forest classifier."""
    print("\n🤖 Training Random Forest model...")
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"✅ Model trained successfully!")
    print(f"\n📊 Model Performance:")
    print(f"  Training Accuracy: {model.score(X_train, y_train):.4f}")
    print(f"  Testing Accuracy: {accuracy:.4f}")
    
    print(f"\n🎯 Classification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    feature_names = ["Task Type", "Complexity", "Skill Level", "Workload"]
    importances = model.feature_importances_
    print(f"\n📈 Feature Importance:")
    for name, importance in zip(feature_names, importances):
        print(f"  {name}: {importance:.4f}")
    
    return model

# ===================================
# 5️⃣ SAVE MODEL AND ENCODERS
# ===================================
def save_artifacts(model, le_task_type, le_skill, le_workload, le_user):
    """Save trained model and encoders to disk."""
    print("\n💾 Saving model and encoders...")
    
    joblib.dump(model, "model.pkl")
    joblib.dump(le_task_type, "le_task_type.pkl")
    joblib.dump(le_skill, "le_skill.pkl")
    joblib.dump(le_workload, "le_workload.pkl")
    joblib.dump(le_user, "le_user.pkl")
    
    print("✅ All artifacts saved:")
    print("  ✓ model.pkl")
    print("  ✓ le_task_type.pkl")
    print("  ✓ le_skill.pkl")
    print("  ✓ le_workload.pkl")
    print("  ✓ le_user.pkl")

# ===================================
# 6️⃣ MAIN EXECUTION
# ===================================
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 SMART SCHEDULER ML MODEL TRAINING")
    print("=" * 60)
    
    try:
        # Load and prepare data
        df = load_and_prepare_data()
        
        # Encode features
        df_encoded, le_task_type, le_skill, le_workload, le_user = encode_features(df)
        
        # Prepare features and target
        X = df_encoded[["task_type", "complexity", "user_skill", "workload"]]
        y = df_encoded["assigned_user"]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        print(f"\n📋 Data split: {len(X_train)} training, {len(X_test)} testing")
        
        # Train model
        model = train_model(X_train, y_train, X_test, y_test)
        
        # Save artifacts
        save_artifacts(model, le_task_type, le_skill, le_workload, le_user)
        
        print("\n" + "=" * 60)
        print("✨ ML Model training completed successfully!")
        print("=" * 60)
        print("\n📝 Next steps:")
        print("1. Copy model.pkl and *.pkl files to backend folder")
        print("2. Ensure GEMINI_API_KEY is set in backend/.env")
        print("3. Start backend: python app.py")
        print("4. Test 'Generate Tasks' feature on frontend")
        
    except Exception as e:
        print(f"\n❌ Error during training: {e}")
        import traceback
        traceback.print_exc()