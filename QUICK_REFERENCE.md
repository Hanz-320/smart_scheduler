# 🎯 Smart Scheduler - Quick Reference Card

## 🚀 Start the System (3 Terminals)

### Terminal 1: Backend
```bash
cd backend
python app.py
```
✓ Runs on: http://localhost:5000  
✓ Ready when you see: "Running on http://127.0.0.1:5000"

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
✓ Runs on: http://localhost:5173  
✓ Ready when you see: "Local: http://localhost:5173/"

### Terminal 3: (Optional) Monitor ML
```bash
cd ml_model
# Already trained! Trained model is in backend/
# To retrain: python train_model.py
```

---

## 🌐 Access the App

Open your browser:
```
http://localhost:5173
```

Click **"✨ Generate Tasks with AI"** to try the core feature!

---

## 📋 Feature Checklist

| Feature | Page | Status |
|---------|------|--------|
| **Generate Tasks (AI/ML)** | `/generate` | ✅ Working |
| **Kanban Board** | `/dashboard` | ✅ Working |
| **Drag & Drop** | `/dashboard` | ✅ Working |
| **Add Manual Task** | `/add` | ✅ Working |
| **Navigation** | All pages | ✅ Working |
| **Firebase Sync** | All pages | 🔲 Ready (not enabled) |
| **User Auth** | All pages | 🔲 Ready (not enabled) |

---

## 🧠 How It Works

```
You describe:     → "Build a mobile app"
                    ↓
Gemini LLM breaks: → "Auth", "Payment", "UI", "Backend"
                    ↓
ML Model assigns:  → Alice (Backend), Bob (Backend), Diana (UI)
                    ↓
Tasks appear:      → On Dashboard automatically!
```

---

## 📊 System Architecture

```
Frontend (React)  ←→  Backend (Flask)  ←→  Gemini LLM
                            ↓
                       ML Model
                       (RandomForest)
                            ↓
                       Firebase DB
                       (optional)
```

---

## 🛠️ Common Tasks

### I want to generate tasks from a prompt
1. Open http://localhost:5173
2. Click "Generate" in navbar
3. Enter project description
4. Click "🚀 Generate Tasks"
5. See results on Dashboard

### I want to manually add a task
1. Click "Add Task" in navbar
2. Fill the form (title, description, priority, assigned, due date)
3. Click "Save Task"
4. Task appears in Dashboard "To Do" column

### I want to move a task
1. Go to Dashboard
2. Click and drag any task card
3. Drop it in another column (To Do → In Progress → Done)

### I want to retrain the ML model
```bash
cd ml_model
# Prepare your data in tasks_dataset.csv
python train_model.py
# Copy new model to backend
Copy-Item *.pkl -Destination "..\backend\" -Force
# Restart backend
```

### I want to improve model accuracy
1. Collect real task assignment data from your team
2. Export as `ml_model/tasks_dataset.csv`
3. Run training: `python ml_model/train_model.py`
4. Deploy new model to backend

---

## 🔧 Troubleshooting

### "Cannot connect to backend"
```bash
# Check backend is running
cd backend
python app.py
```

### "Tasks not generating"
- Check browser console (F12)
- Check backend terminal for errors
- Verify GEMINI_API_KEY in `backend/.env`

### "Low model accuracy"
- Current model trained on 200 synthetic samples
- Provide real data for better results
- See `ml_model/README.md` for details

### "Frontend won't start"
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### "Import errors in backend"
```bash
cd backend
pip install -r requirements.txt
python app.py
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/GenerateTasks.jsx` | Core AI feature |
| `backend/app.py` | Flask API server |
| `ml_model/train_model.py` | ML training script |
| `backend/model.pkl` | Trained ML model |
| `backend/.env` | Gemini API key |
| `SETUP_GUIDE.md` | Full documentation |

---

## 🎓 Documentation

- **SETUP_GUIDE.md** — Complete setup & architecture
- **ml_model/README.md** — ML training details
- **README.md** — Project overview
- **TRAINING_SUMMARY.md** — What was built

---

## ✅ Quick Checklist

Before reporting issues:
- [ ] Backend running on port 5000?
- [ ] Frontend running on port 5173?
- [ ] GEMINI_API_KEY set in `backend/.env`?
- [ ] ML model files exist in `backend/`?
- [ ] No errors in browser console (F12)?
- [ ] No errors in backend terminal?

---

## 🚀 You're Ready!

Everything is set up and ready to use. The system integrates:
- ✅ Gemini LLM (AI)
- ✅ Random Forest (ML)
- ✅ React + Flask
- ✅ Firebase (optional)

**Start the 3 terminals above and enjoy!** 🎉

---

**Need help?** See SETUP_GUIDE.md → Troubleshooting section
