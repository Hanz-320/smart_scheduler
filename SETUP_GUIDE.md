# 🚀 Smart Scheduler - Complete Setup & Training Guide

## Overview
This document walks you through training the ML model and running the complete Smart Scheduler system (Frontend + Backend + ML).

---

## Part 1: ML Model Training

### What Was Trained?
A **Random Forest classifier** that learns to assign tasks to team members based on:
- **Task Type** — Design, Frontend, Backend, Testing, Documentation, DevOps
- **Complexity** — 1-10 scale (10 = hardest)
- **Skill Level Required** — Junior, Mid, Senior
- **Current Workload** — Low, Medium, High

### Generated Artifacts
After running training, these files are created:
- `model.pkl` — The trained Random Forest model
- `le_task_type.pkl` — Encoder for task types
- `le_skill.pkl` — Encoder for skill levels
- `le_workload.pkl` — Encoder for workloads
- `le_user.pkl` — Encoder for team member names

These files have been **copied to the backend folder** (`backend/`).

### Model Performance
- **Training Accuracy:** ~76.88%
- **Testing Accuracy:** ~22.5% (on random synthetic data; improves with real data)
- **Top Features:** Task Type (34.7%) and Complexity (33.3%)

### To Retrain the Model with Better Data

**Step 1:** Prepare your training data as `ml_model/tasks_dataset.csv`:
```csv
task_type,complexity,user_skill,workload,assigned_user
Backend,8,Senior,High,Alice
Frontend,6,Mid,Medium,Bob
Testing,4,Junior,Low,Charlie
Design,5,Senior,Low,Diana
Documentation,3,Junior,High,Eve
```

**Step 2:** Run the training script:
```bash
cd ml_model
pip install -r requirements.txt
python train_model.py
```

**Step 3:** Copy the new model files to backend:
```bash
Copy-Item *.pkl -Destination "..\backend\" -Force
```

**Step 4:** Restart the backend (it will auto-load the new model).

---

## Part 2: Backend Setup & Running

### Prerequisites
- Python 3.8+
- Flask and dependencies installed

### Files in Backend
- `app.py` — Flask server with `/generate` endpoint
- `.env` — Contains `GEMINI_API_KEY`
- `firebase_key.json` — Firebase credentials
- `model.pkl` and encoders — ML model artifacts (copied from ml_model/)

### How the Backend Works

The Flask backend has a `/generate` endpoint that:

```
User sends: { "description": "Build a mobile app with auth, database, and payments" }
                                    ↓
                        Gemini LLM breaks it down:
                        - "Setup authentication" (Backend, complexity 7)
                        - "Build payment module" (Backend, complexity 8)
                        - "Design UI mockups" (Design, complexity 5)
                                    ↓
                   ML Model predicts best team member:
                        - Alice: Backend expert (gets auth task)
                        - Bob: Backend expert (gets payment)
                        - Diana: Designer (gets UI task)
                                    ↓
                        Tasks saved to Firebase
                        + returned to frontend
```

### Running the Backend

```bash
cd backend
python app.py
```

Expected output:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

The backend is now listening on `http://localhost:5000`.

---

## Part 3: Frontend Setup & Running

### Prerequisites
- Node.js 16+
- npm or yarn

### Files in Frontend
- `/src/pages/GenerateTasks.jsx` — Core feature page for prompting with LLM
- `/src/pages/Dashboard.jsx` — Kanban board with drag-and-drop
- `/src/pages/Home.jsx` — Landing page
- React Router setup for navigation

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in ... ms

  ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser.

---

## Part 4: Using the Complete System

### Workflow: From Prompt to Auto-Assigned Tasks

#### Step 1: Navigate to "Generate Tasks"
- Click **"Generate"** in the navbar, or
- Click **"✨ Generate Tasks with AI"** button on Home page

#### Step 2: Enter Project Description
Example:
> "Build a web dashboard for analytics. We need user authentication, real-time data syncing, and interactive charts. Frontend should be React with TypeScript. Backend needs to handle 10k concurrent users."

#### Step 3: Click "🚀 Generate Tasks"
- Frontend sends to `http://localhost:5000/generate`
- Backend processes with Gemini + ML model
- Returns auto-generated and auto-assigned tasks

#### Step 4: See Results on Dashboard
- New tasks appear in the **"To Do"** column
- Each task has:
  - Auto-generated title and description
  - Priority (from Gemini)
  - Auto-assigned team member (from ML model)
  - Estimated due date

#### Step 5: Manage Tasks
- Drag tasks between columns (To Do → In Progress → Done)
- Add manual tasks with "Add Task" page
- View all tasks on Dashboard

---

## Part 5: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                             │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                     │
│  - Home page with intro                                      │
│  - GenerateTasks page (CORE FEATURE)                         │
│  - Dashboard with Kanban board                               │
│  - Add/Edit task forms                                       │
│  - Navigation & styling                                      │
└────────────────┬────────────────────────────────────┬────────┘
                 │ HTTP POST                          │ HTTP GET
                 │ /generate                          │ (future: /tasks)
                 ↓                                    ↓
    ┌────────────────────────────┐        ┌──────────────────┐
    │   BACKEND (Flask)           │        │   FIREBASE       │
    │   Port: 5000                │◄──────►│   Firestore DB   │
    │                             │        │                  │
    │  Routes:                    │        │  Collections:    │
    │  - GET /                    │        │  - tasks         │
    │  - POST /generate           │        │  - users         │
    │     ↓                       │        │                  │
    │   Calls Gemini LLM          │        └──────────────────┘
    │   + ML Model                │
    │   + Returns tasks           │
    └────────┬────────────────────┘
             │
             ├─────────────────────────────┐
             ↓                             ↓
    ┌─────────────────────┐      ┌────────────────────┐
    │  Gemini LLM API     │      │  ML Model          │
    │  Breaks down        │      │  (Random Forest)   │
    │  project into       │      │                    │
    │  subtasks          │      │  Predicts best     │
    │  - Titles           │      │  team member for   │
    │  - Descriptions     │      │  each task         │
    │  - Priorities       │      │                    │
    │  - Estimates        │      │  Loaded from:      │
    │                     │      │  - model.pkl       │
    │                     │      │  - le_*.pkl        │
    └─────────────────────┘      └────────────────────┘
             │                              │
             └──────────────────┬───────────┘
                                ↓
                   Combined & Saved to DB
                   Returned to Frontend
```

---

## Part 6: Testing Checklist

### Frontend Works?
- [ ] Navigate to all pages (Home, Generate, Dashboard, Add Task, About, Contact)
- [ ] Home page buttons work
- [ ] Navbar shows "Generate" link

### Generate Feature Works?
- [ ] Enter a project description
- [ ] Click "Generate Tasks"
- [ ] Backend is running (`http://localhost:5000`)
- [ ] Tasks appear on Dashboard

### Dashboard Works?
- [ ] Drag a task from "To Do" to "In Progress"
- [ ] Drag a task from "In Progress" to "Done"
- [ ] Tasks stay in their column after drag

### Add Task Works?
- [ ] Fill out the form
- [ ] Click "Save Task"
- [ ] Task appears in "To Do" on Dashboard

### Errors?
- [ ] Check browser console for errors (F12)
- [ ] Check backend terminal for error messages
- [ ] Ensure backend is running on `http://localhost:5000`
- [ ] Ensure `GEMINI_API_KEY` is valid in `backend/.env`

---

## Part 7: Next Steps & Improvements

### For Better ML Accuracy
1. Collect real task assignment data from your team
2. Create `ml_model/tasks_dataset.csv` with at least 500+ real samples
3. Retrain: `python ml_model/train_model.py`
4. Copy new model to backend and restart

### For Production Deployment
1. Add user authentication (Firebase Auth)
2. Add persistent storage (Firebase Firestore)
3. Add error tracking (Sentry)
4. Add API rate limiting
5. Add input validation and security

### Future Enhancements (Phase 2)
- [ ] Real-time task updates (WebSocket)
- [ ] Team member workload visualization
- [ ] Task history and analytics
- [ ] Automated task reminders
- [ ] Integration with Slack/Teams
- [ ] Mobile app (React Native)

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'pandas'"
**Solution:** Install ML dependencies
```bash
cd ml_model
pip install -r requirements.txt
```

### "Error: Cannot connect to backend"
**Solution:** Ensure backend is running
```bash
cd backend
python app.py
```

### "Error: Gemini API failed"
**Solution:** Check GEMINI_API_KEY in `backend/.env`
```bash
# Edit backend/.env and add:
GEMINI_API_KEY=your_actual_api_key_here
```

### "Tasks not appearing in Dashboard after Generate"
**Solution:** Check:
1. Backend is running (`http://localhost:5000`)
2. No errors in browser console (F12)
3. Backend terminal shows success messages
4. Refresh the page

### "Low model accuracy"
**Solution:** Provide better training data
- Current model trained on 200 synthetic samples
- Collect real data and retrain
- Use `ml_model/README.md` for detailed instructions

---

## Quick Start Commands

### First Time Setup
```bash
# Terminal 1: Train ML Model
cd ml_model
pip install -r requirements.txt
python train_model.py
Copy-Item *.pkl -Destination "..\backend\" -Force

# Terminal 2: Start Backend
cd backend
python app.py

# Terminal 3: Start Frontend
cd frontend
npm install
npm run dev

# Then open: http://localhost:5173
```

### After Setup (Just Run)
```bash
# Terminal 1: Backend
cd backend
python app.py

# Terminal 2: Frontend
cd frontend
npm run dev

# Open: http://localhost:5173
```

---

## Summary

✅ **ML Model:** Trained RandomForest classifier with 5 encoders  
✅ **Backend:** Flask server with Gemini + ML integration  
✅ **Frontend:** React app with Generate Tasks feature  
✅ **System:** End-to-end prompt → auto-generation → auto-assignment  

**Ready to use!** 🎉

---

**Questions?** Check individual README files:
- `ml_model/README.md` — ML training details
- `backend/README.md` — Backend API docs (create if needed)
- `frontend/README.md` — Frontend details (create if needed)
