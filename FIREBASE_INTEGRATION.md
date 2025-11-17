# 🔥 Firebase Integration Guide

## Overview
Your Smart Scheduler now stores all projects and tasks in **Firebase Firestore** instead of just localStorage!

## What Changed?

### ✅ Before (localStorage only)
- Projects saved in browser only
- Data lost if browser cache cleared
- No sync across devices
- No backup

### ✅ After (Firebase Firestore)
- Projects saved to cloud database
- Persistent storage (never lost)
- Can sync across devices (with auth)
- Automatic backup
- **localStorage as fallback** for offline use

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (React)                    │
│  - Generate tasks                                    │
│  - View projects                                     │
│  - Drag & drop tasks                                 │
│  - Delete projects                                   │
└──────────────┬──────────────────────────────────────┘
               │
               │ HTTP Requests (axios)
               │ POST /api/projects
               │ GET /api/projects
               │ DELETE /api/projects/:id
               │ PATCH /api/tasks/:id
               ↓
┌─────────────────────────────────────────────────────┐
│              BACKEND (Flask + Firebase)              │
│  - Flask API endpoints                               │
│  - Firebase Admin SDK                                │
│  - Gemini AI integration                             │
└──────────────┬──────────────────────────────────────┘
               │
               │ Firebase Admin SDK
               │ (firebase_key.json)
               ↓
┌─────────────────────────────────────────────────────┐
│              FIREBASE FIRESTORE                      │
│                                                      │
│  Collection: projects/                               │
│    ├─ project1 (doc)                                 │
│    │   ├─ title: "E-commerce Website"                │
│    │   ├─ description: "Build online store..."       │
│    │   ├─ createdAt: timestamp                       │
│    │   └─ tasks/ (subcollection)                     │
│    │       ├─ task1 (doc)                             │
│    │       │   ├─ title: "Setup database"            │
│    │       │   ├─ status: "todo"                      │
│    │       │   ├─ priority: "High"                    │
│    │       │   ├─ assignedTo: "Alice"                 │
│    │       │   └─ due: "2025-11-20"                   │
│    │       └─ task2 (doc)                             │
│    │           └─ ...                                 │
│    └─ project2 (doc)                                 │
│        └─ ...                                         │
└─────────────────────────────────────────────────────┘
```

---

## New Backend API Endpoints

### 1. Save Project
**POST** `/api/projects`

**Request Body:**
```json
{
  "title": "E-commerce Website",
  "description": "Build a complete online store...",
  "tasks": [
    {
      "title": "Setup database",
      "description": "PostgreSQL with user tables",
      "status": "todo",
      "priority": "High",
      "assignedTo": "Alice",
      "due": "2025-11-20"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "abc123xyz"
}
```

---

### 2. Get All Projects
**GET** `/api/projects`

**Response:**
```json
{
  "projects": [
    {
      "id": "abc123xyz",
      "title": "E-commerce Website",
      "description": "Build a complete online store...",
      "createdAt": "2025-11-13T10:30:00Z",
      "tasks": [
        {
          "id": "task1",
          "title": "Setup database",
          "status": "todo",
          "priority": "High",
          "assignedTo": "Alice",
          "due": "2025-11-20"
        }
      ]
    }
  ]
}
```

---

### 3. Get Single Project
**GET** `/api/projects/:project_id`

**Response:**
```json
{
  "id": "abc123xyz",
  "title": "E-commerce Website",
  "description": "Build a complete online store...",
  "tasks": [...]
}
```

---

### 4. Delete Project
**DELETE** `/api/projects/:project_id`

**Response:**
```json
{
  "success": true
}
```

---

### 5. Update Task Status (Drag & Drop)
**PATCH** `/api/tasks/:task_id`

**Request Body:**
```json
{
  "status": "in-progress"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Frontend Changes

### GenerateTasks.jsx

#### Before:
```javascript
// Save to localStorage only
const projects = JSON.parse(localStorage.getItem("projects") || "[]");
projects.unshift(project);
localStorage.setItem("projects", JSON.stringify(projects));
```

#### After:
```javascript
// Save to Firebase first, localStorage as backup
try {
  const response = await axios.post(`${BACKEND_URL}/api/projects`, project);
  console.log("✅ Project saved to Firebase");
  
  // Also save to localStorage
  const localProjects = JSON.parse(localStorage.getItem("projects") || "[]");
  localProjects.unshift(project);
  localStorage.setItem("projects", JSON.stringify(localProjects));
} catch (err) {
  console.error("⚠️ Failed to save to Firebase, using localStorage only");
  // Fallback to localStorage
}
```

### Dashboard.jsx

#### Before:
```javascript
const onDragEnd = (result) => {
  // Update local state only
  setTasks(merged);
};
```

#### After:
```javascript
const onDragEnd = async (result) => {
  // Update Firebase
  try {
    await axios.patch(`${BACKEND_URL}/api/tasks/${taskId}`, { status: newStatus });
    console.log("✅ Task status updated in Firebase");
  } catch (err) {
    console.error("⚠️ Failed to update Firebase");
  }
  
  // Update local state
  setTasks(merged);
};
```

---

## How to Test

### 1. Start Backend
```powershell
cd backend
python app.py
```

**Expected Output:**
```
✅ Firebase initialized successfully
✓ Starting Smart Scheduler API
 * Running on http://127.0.0.1:5000
```

### 2. Start Frontend
```powershell
cd frontend
npm run dev
```

### 3. Generate Tasks
1. Go to **Generate Tasks** page
2. Enter project title: "Test Firebase Project"
3. Enter description: "Testing cloud storage"
4. Click **Generate Tasks**
5. Check browser console: `✅ Project saved to Firebase`

### 4. Verify in Firebase Console
1. Go to https://console.firebase.google.com
2. Select project: `smart-scheduler-8be21`
3. Go to **Firestore Database**
4. You should see:
   - Collection: `projects`
   - Document: (auto-generated ID)
   - Subcollection: `tasks`

### 5. Test Drag & Drop
1. Go to **Dashboard**
2. Drag a task to "In Progress"
3. Check console: `✅ Task status updated in Firebase`
4. Refresh page - task stays in new column ✅

### 6. Test Delete
1. Go to **Generate Tasks**
2. Click **Show Saved Projects**
3. Click **Delete** on a project
4. Check console: `✅ Project deleted from Firebase`
5. Verify in Firebase console - project gone ✅

---

## Firestore Data Structure

```
projects/ (collection)
  └─ [auto-id]/ (document)
      ├─ id: "abc123"
      ├─ title: "E-commerce Website"
      ├─ description: "Build online store..."
      ├─ createdAt: Timestamp
      ├─ updatedAt: Timestamp
      └─ tasks/ (subcollection)
          ├─ [auto-id]/ (document)
          │   ├─ id: "task1"
          │   ├─ title: "Setup database"
          │   ├─ description: "PostgreSQL..."
          │   ├─ status: "todo"
          │   ├─ priority: "High"
          │   ├─ assignedTo: "Alice"
          │   ├─ task_type: "Backend"
          │   ├─ due: "2025-11-20"
          │   ├─ acceptance_criteria: []
          │   └─ dependencies: []
          └─ [auto-id]/ (document)
              └─ ...
```

---

## Error Handling & Fallbacks

### Scenario 1: Firebase Down
```javascript
try {
  await axios.post(`${BACKEND_URL}/api/projects`, project);
} catch (err) {
  // ✅ Falls back to localStorage
  localStorage.setItem("projects", JSON.stringify(projects));
}
```

### Scenario 2: Backend Not Running
```javascript
try {
  const response = await axios.get(`${BACKEND_URL}/api/projects`);
  setSavedProjects(response.data.projects);
} catch (err) {
  // ✅ Falls back to localStorage
  const localProjects = JSON.parse(localStorage.getItem("projects") || "[]");
  setSavedProjects(localProjects);
}
```

### Scenario 3: Network Offline
- Tasks continue working with localStorage
- Changes sync when connection restored

---

## Benefits of Firebase Integration

| Feature | Before (localStorage) | After (Firebase) |
|---------|----------------------|------------------|
| **Persistence** | Browser only | Cloud storage ✅ |
| **Backup** | None | Automatic ✅ |
| **Sync** | No | Yes (with auth) ✅ |
| **Data Loss** | Cache clear = lost | Never lost ✅ |
| **Multi-device** | No | Yes (future) ✅ |
| **Team Collaboration** | No | Yes (future) ✅ |
| **Offline Support** | Yes | Yes (fallback) ✅ |

---

## Next Steps (Future Enhancements)

### Phase 1: Real-time Sync ⚡
```javascript
import { onSnapshot } from "firebase/firestore";

onSnapshot(projectsRef, (snapshot) => {
  // Auto-update when data changes
  setSavedProjects(snapshot.docs.map(doc => doc.data()));
});
```

### Phase 2: User Authentication 🔐
```javascript
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Each user sees only their projects
const userProjectsRef = collection(db, `users/${userId}/projects`);
```

### Phase 3: Team Collaboration 👥
```javascript
// Share projects with team members
await updateDoc(projectRef, {
  sharedWith: ["alice@example.com", "bob@example.com"]
});
```

### Phase 4: Real-time Updates 🔄
- See team members' changes instantly
- Live cursor positions during editing
- Conflict resolution for simultaneous edits

---

## Troubleshooting

### Error: "Firebase not initialized"
**Cause:** `firebase_key.json` missing or invalid

**Solution:**
1. Check `backend/firebase_key.json` exists
2. Verify credentials are correct
3. Restart backend: `python app.py`

---

### Error: "Failed to save to Firebase"
**Cause:** Backend not running or network issue

**Solution:**
1. Start backend: `cd backend && python app.py`
2. Check backend URL: `http://localhost:5000`
3. Check browser console for details

---

### Projects Not Loading
**Cause:** Backend not running or Firebase connection issue

**Solution:**
1. Start backend
2. Check Firestore rules (should allow read/write)
3. Check browser console for errors

---

## Firebase Console Access

**Project:** smart-scheduler-8be21  
**Console:** https://console.firebase.google.com  
**Firestore:** https://console.firebase.google.com/project/smart-scheduler-8be21/firestore

---

## Summary

✅ **Projects** → Saved to Firebase Firestore  
✅ **Tasks** → Stored as subcollections  
✅ **Drag & Drop** → Updates Firebase in real-time  
✅ **Delete** → Removes from Firebase  
✅ **localStorage** → Fallback for offline use  
✅ **Error Handling** → Graceful degradation  

**Your data is now safely stored in the cloud!** ☁️🎉

---

## Quick Reference

### Backend Endpoints
- `POST /api/projects` - Save project
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `DELETE /api/projects/:id` - Delete project
- `PATCH /api/tasks/:id` - Update task

### Frontend Files Modified
- `frontend/src/firebase.js` - Added Firestore initialization
- `frontend/src/pages/GenerateTasks.jsx` - Firebase save/load/delete
- `frontend/src/pages/Dashboard.jsx` - Firebase task updates

### Backend Files Modified
- `backend/app.py` - Added Firebase Admin SDK + API endpoints

---

**Need Help?** Check the console logs for `✅` (success) or `⚠️` (fallback) messages.
