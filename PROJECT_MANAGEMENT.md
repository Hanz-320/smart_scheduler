# 📁 Project Management Feature

## Overview
The Generate Tasks page now includes project management capabilities - save your project descriptions and generated tasks, then reload them anytime!

## Features

### 1. **Project Title Input**
- Every project now requires a title
- Helps organize and identify your projects

### 2. **Auto-Save to localStorage**
When you generate tasks, the system automatically saves:
- Project title
- Project description
- All generated tasks
- Creation timestamp

### 3. **View Saved Projects**
Click "📁 Show Saved Projects" button to see all your saved projects:
- Shows project title
- Preview of description (first 100 chars)
- Number of tasks
- Creation date

### 4. **Load Projects**
- Click on any saved project to load it
- All tasks are restored to the Dashboard
- Project details are loaded into the form

### 5. **Delete Projects**
- Each project has a "Delete" button
- Confirmation required before deletion
- Removes project from storage

## Storage Location

All projects are saved in your browser's localStorage:
- Key: `"projects"`
- Format: JSON array of project objects

### Project Object Structure:
```javascript
{
  id: 1699999999999,                    // Timestamp
  title: "E-commerce Website",          // User-entered title
  description: "Build a...",            // Project description
  tasks: [...],                         // Array of generated tasks
  createdAt: "2025-11-13T04:00:00.000Z" // ISO timestamp
}
```

## How to Use

### Generating a New Project:
1. Enter a **Project Title** (e.g., "Mobile App Development")
2. Enter a **Project Description** (e.g., "Build an iOS app for...")
3. Click **"🚀 Generate Tasks"**
4. Project is automatically saved
5. Tasks appear on Dashboard

### Loading a Saved Project:
1. Click **"📁 Show Saved Projects"**
2. Browse your saved projects
3. Click on any project to load it
4. Tasks are loaded to Dashboard

### Deleting a Project:
1. Click **"📁 Show Saved Projects"**
2. Click **"Delete"** button on the project
3. Confirm deletion
4. Project is removed permanently

## UI Components

### Project Title Field
- Required field
- Located above the description textarea
- Placeholder: "E.g., E-commerce Website, Mobile App, Analytics Dashboard"

### Saved Projects List
- Collapsible section
- Shows when "Show Saved Projects" is clicked
- Each project shows:
  - Title (bold, clickable)
  - Description preview
  - Task count + creation date
  - Delete button

## Technical Details

### State Management:
```javascript
const [projectTitle, setProjectTitle] = useState("");
const [savedProjects, setSavedProjects] = useState([]);
const [showProjects, setShowProjects] = useState(false);
```

### Loading Projects on Mount:
```javascript
useEffect(() => {
  const projects = JSON.parse(localStorage.getItem("projects") || "[]");
  setSavedProjects(projects);
}, []);
```

### Saving a Project:
```javascript
const project = {
  id: Date.now(),
  title: projectTitle,
  description: description,
  tasks: formattedTasks,
  createdAt: new Date().toISOString(),
};

const projects = JSON.parse(localStorage.getItem("projects") || "[]");
projects.unshift(project); // Add to beginning
localStorage.setItem("projects", JSON.stringify(projects));
```

## Benefits

1. **No Backend Required** - Uses localStorage for instant access
2. **Persistent** - Projects survive page refreshes
3. **Quick Access** - Reload any project instantly
4. **Organization** - Keep multiple projects organized
5. **Privacy** - All data stays in your browser

## Limitations

- Projects are stored per browser/device
- Clearing browser data deletes all projects
- No cloud sync across devices
- Storage limit: ~5-10MB depending on browser

## Future Enhancements

Possible improvements:
- [ ] Export projects to JSON file
- [ ] Import projects from JSON file
- [ ] Search/filter projects
- [ ] Edit project titles
- [ ] Project tags/categories
- [ ] Cloud sync (Firebase)
- [ ] Share projects via link
- [ ] Project templates

## Styling

Uses inline styles with hover effects:
- Clean card-based UI
- Blue accent color on hover
- Smooth transitions
- Responsive layout
- Delete button in red

## Example Usage

### Scenario 1: Multiple Projects
1. Create "Website Redesign" project
2. Create "Mobile App v2" project
3. Create "Marketing Campaign" project
4. Switch between them by clicking in saved projects list

### Scenario 2: Iterative Development
1. Generate initial tasks
2. Complete some work
3. Come back later
4. Load the project
5. Continue where you left off

---

**Now you can manage multiple projects easily! 🎉**
