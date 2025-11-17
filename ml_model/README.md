# ML Model Training Guide

## Overview
This folder contains the ML model training script that learns to assign tasks to team members based on task characteristics.

## Files
- **train_model.py** — Main training script
- **tasks.csv** — Sample task data (can be replaced with real data)
- **tasks_dataset.csv** — Generated training dataset (auto-created if missing)
- **requirements.txt** — Python dependencies

## Generated Artifacts (after training)
- **model.pkl** — Trained Random Forest classifier
- **le_task_type.pkl** — LabelEncoder for task types
- **le_skill.pkl** — LabelEncoder for skill levels
- **le_workload.pkl** — LabelEncoder for workload levels
- **le_user.pkl** — LabelEncoder for team member names

## How to Train the Model

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Prepare Your Data (Optional)
If you have real task assignment data, create a `tasks_dataset.csv` file with these columns:
```
task_type,complexity,user_skill,workload,assigned_user
Design,5,Mid,Low,Alice
Frontend,7,Senior,Medium,Bob
Backend,8,Senior,High,Charlie
Testing,4,Junior,Medium,Diana
Documentation,3,Junior,Low,Eve
```

**Column Descriptions:**
- `task_type` — Type of task (Design, Frontend, Backend, Testing, Documentation, DevOps, etc.)
- `complexity` — Task complexity on a scale of 1-10
- `user_skill` — Required skill level (Junior, Mid, Senior)
- `workload` — Current team member workload (Low, Medium, High)
- `assigned_user` — Team member name assigned to this task

### Step 3: Run the Training Script
```bash
python train_model.py
```

**Output:**
- Displays dataset statistics
- Shows feature encoding mappings
- Trains Random Forest model
- Displays accuracy metrics and feature importance
- Saves all model artifacts (.pkl files)

### Step 4: Copy Model Artifacts to Backend
After training, copy the generated `.pkl` files to the backend folder:
```bash
# From ml_model folder:
copy *.pkl ../backend/
```

Or copy these files manually:
- `model.pkl`
- `le_task_type.pkl`
- `le_skill.pkl`
- `le_workload.pkl`
- `le_user.pkl`

## Model Details

### Features Used
1. **task_type** — What kind of work needs to be done
2. **complexity** — How difficult is the task (1-10)
3. **user_skill** — What skill level is required
4. **workload** — Current workload of the team member

### Target
- **assigned_user** — Which team member should be assigned

### Algorithm
- **Random Forest Classifier** with 100 trees
- Handles non-linear relationships between features and assignments
- Provides feature importance scores

## Example: How It's Used in the Backend

When a user enters a project description in the frontend:

1. **Gemini LLM** breaks it into tasks with details
2. **ML Model** predicts the best team member for each task:
   ```python
   task_input = [
       task_type_encoded,    # e.g., "Frontend" → 1
       complexity,           # e.g., 7
       skill_encoded,        # e.g., "Senior" → 2
       workload_encoded      # e.g., "Medium" → 1
   ]
   assigned_user = model.predict([task_input])[0]  # Returns: 0 → "Alice"
   ```
3. Tasks are saved to Firebase with auto-assigned users

## Customization

### Add More Team Members
Edit `create_sample_dataset()` in `train_model.py`:
```python
team_members = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"]
```

### Use Real Data
Place your `tasks_dataset.csv` in this folder and run the script. It will use your data instead of generating samples.

### Improve Model Accuracy
- Collect more training data (200+ samples recommended)
- Add more features (project type, deadline urgency, etc.)
- Try different algorithms (GradientBoosting, XGBoost)
- Tune hyperparameters in `RandomForestClassifier`

## Troubleshooting

**Error: "tasks_dataset.csv not found"**
- The script will auto-generate sample data. No action needed.

**Error: "Import not found (pandas, sklearn, etc.)"**
- Install dependencies: `pip install -r requirements.txt`

**Low model accuracy**
- Provide more/better training data
- Check if features are appropriately normalized
- Ensure task types and skill levels match those in Gemini's output

## Next Steps

1. ✅ Run `python train_model.py` to train the model
2. ✅ Copy the `.pkl` files to `backend/` folder
3. ✅ Set `GEMINI_API_KEY` in `backend/.env`
4. ✅ Start the backend: `python app.py` (from `backend/` folder)
5. ✅ Start the frontend: `npm run dev` (from `frontend/` folder)
6. ✅ Test "Generate Tasks from Prompt" feature on the frontend

Happy task assigning! 🚀
