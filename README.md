# 🚀 Smart Scheduling & Productivity Assistant

A full-stack web platform that combines **AI (Gemini LLM)** and **Kanban-style task management** to automatically break down projects into tasks and assign them to team members.

## 🎯 Core Features

✨ **AI-Powered Task Generation** — Describe your project and Gemini LLM breaks it into actionable subtasks  
🤖 **Smart Task Assignment** — A machine learning model assigns tasks to team members based on the task type and complexity.  
📊 **Kanban Board** — Drag-and-drop interface to manage tasks (To Do → In Progress → Done)  
🎨 **Interactive UI** — Modern, responsive design with smooth animations  
💾 **Firebase Persistence** — Tasks saved automatically in Firestore.
⚡ **Rate Limiting** — Smart API usage management (10 calls/minute)

## 📁 Project Structure

```
smart_scheduler/
├── frontend/                 # React + Vite + Router + Beautiful DnD
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page
│   │   │   ├── GenerateTasks.jsx # ⭐ Core AI feature
│   │   │   ├── Dashboard.jsx     # Kanban board
│   │   │   ├── AddTask.jsx       # Manual task creation
│   │   │   ├── About.jsx
│   │   │   └── Contact.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   └── Column.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
│
├── backend/                  # Flask + Gemini + ML
│   ├── app.py                # Main Flask server
│   ├── requirements.txt
│   ├── .env                  # GEMINI_API_KEY
│   ├── firebase_key.json     # Firebase credentials
│   ├── duration_model.pkl    # ✅ Trained ML model for duration estimation
│   ├── assignment_model.pkl  # ✅ Trained ML model for assignment
│   ├── le_*.pkl              # ✅ Label encoders
│   └── README.md
│
├── ml_model/                 # Machine Learning Pipeline
│   ├── train_duration_model.py # ✅ Training script for duration model
│   ├── train_assignment_model.py # ✅ Training script for assignment model
│   ├── requirements.txt
│   ├── tasks_dataset.csv     # Sample training data
│   └── README.md
│
└── SETUP_GUIDE.md            # 📖 Comprehensive setup guide
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+** (for frontend)
- **Python 3.8+** (for backend & ML)
- **Gemini API Key** (get from Google AI Studio)
- **Firebase Project** (optional, for persistence)

### Step 1: Train ML Models
```bash
cd ml_model
pip install -r requirements.txt
python train_duration_model.py
python train_assignment_model.py
```

This generates:
- `duration_model.pkl` — Trained Gradient Boosting regressor for task duration.
- `assignment_model.pkl` — Trained Random Forest classifier for task assignment.
- `le_*.pkl` — Label encoders.

These are automatically copied to `backend/` and `backend/ml_model` respectively.

### Step 2: Start Backend (Terminal 1)
```bash
cd backend
python app.py
```

Backend runs on: `http://localhost:5000`

### Step 3: Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Step 4: Use the App
1. Open **http://localhost:5173** in your browser
2. Click **"Generate Tasks with AI"** (or "Generate" in navbar)
3. Enter a project description
4. Click **"🚀 Generate Tasks"**
5. Watch tasks auto-populate on Dashboard with auto-assigned team members!

## 🎬 Workflow

```
User: "Build a mobile banking app with authentication, payments, and analytics"
                              ↓
                    [GenerateTasks.jsx]
                              ↓
                    POST /generate → Backend
                              ↓
            ┌─────────────────────────────────┐
            │  Backend Processing              │
            │  1. Gemini LLM breaks it down   │
            │  2. ML model assigns users      │
            │  3. Save to Firebase            │
            └─────────────────────────────────┘
                              ↓
                  Tasks auto-appear on Dashboard:
                  - "Setup Firebase Auth" → Charlie
                  - "Build Payment Module" → Bob
                  - "Design UI Mockups" → Alice
                  - "Create Analytics Dashboard" → Diana
```

## 📊 Model Performance

**Assignment Model Type:** Random Forest Classifier  
**Features:** Task Type, Complexity  
**Training Accuracy:** 28%  
**Data:** 200 synthetic samples (improves with real data)  

To improve accuracy, provide real training data in `ml_model/tasks_dataset.csv` and retrain.

## 🛠️ Development Commands

### Frontend
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend
```bash
cd backend
python app.py        # Start server (debug mode on)
```

### ML Model
```bash
cd ml_model
python train_duration_model.py    # Train duration model
python train_assignment_model.py  # Train assignment model
```

## 📚 Detailed Documentation

- **Setup Instructions:** See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **ML Training Guide:** See [ml_model/README.md](./ml_model/README.md)
- **Backend API Docs:** See [backend/README.md](./backend) (if exists)

## 🔐 Configuration

### Frontend
- Firebase config: `frontend/src/firebase.js`
- React Router: `frontend/src/App.jsx`
- Styling: `frontend/src/App.css`, `index.css`

### Backend
- API Key: `backend/.env`
  ```
  GEMINI_API_KEY=your_key_here
  FLASK_ENV=development
  ```
- Firebase: `backend/firebase_key.json`

### ML Model
- Training data: `ml_model/tasks_dataset.csv`
- Output: `ml_model/*.pkl` files (copied to backend)

## 🚧 What's Included (Phase 1)

✅ Full React frontend with Kanban board  
✅ Drag-and-drop task management (react-beautiful-dnd)  
✅ AI task generation via Gemini LLM  
✅ ML-based task assignment (Random Forest)  
✅ Flask backend with /generate endpoint  
✅ Firebase integration ready (Firestore)  
✅ Complete ML training pipeline  
✅ Comprehensive documentation  

## 🔮 Future Enhancements (Phase 2+)

- [ ] Real-time collaboration (WebSocket)
- [ ] Team member activity tracking
- [ ] Advanced analytics & insights
- [ ] Mobile app (React Native)
- [ ] Slack/Teams integration
- [ ] Automated task escalation
- [ ] Historical task patterns analysis
- [ ] Budget & resource tracking

## 🐛 Troubleshooting

**Frontend won't start?**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Backend errors?**
- Check `GEMINI_API_KEY` in `backend/.env`
- Ensure ML model files exist in `backend/` and `backend/ml_model`
- Check Python dependencies: `pip install -r requirements.txt`

**ML model not found?**
```bash
cd ml_model
python train_duration_model.py
python train_assignment_model.py
Copy-Item *.pkl -Destination "..\backend\" -Force
Copy-Item ml_model\*.pkl -Destination "..\backend\ml_model\" -Force
```

**Tasks not generating?**
- Backend must be running on `http://localhost:5000`
- Check browser console for errors (F12)
- Check backend terminal for error messages

## 📞 Support

For detailed setup instructions, see **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**

---

**Built with:** React • Flask • Random Forest • Gemini LLM • Firebase • Vite  
**Status:** ✅ Production-Ready (Phase 1)  
**Last Updated:** November 2025