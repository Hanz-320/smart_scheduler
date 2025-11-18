import React, { useState, useEffect } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import Column from "../components/Column";
import EditTaskModal from "../components/EditTaskModal";
import AddTaskModal from "../components/AddTaskModal";
import axios from "axios";
import { useTheme } from "../contexts/ThemeContext";

const BACKEND_URL = "http://localhost:5000";

export default function Dashboard({ tasks, setTasks, user }) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("dashboardViewMode") || "user-status";
  });
  const [currentProjectTitle, setCurrentProjectTitle] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState("");
  const [availableProjects, setAvailableProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [lastTaskUpdate, setLastTaskUpdate] = useState(Date.now());

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem("dashboardViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const savedTitle = localStorage.getItem("currentProjectTitle");
    const savedProjectId = localStorage.getItem("currentProjectId");
    const cachedTasks = localStorage.getItem("tasks");
    
    if (savedTitle) setCurrentProjectTitle(savedTitle);
    if (savedProjectId) setCurrentProjectId(savedProjectId);
    if (cachedTasks) {
      try {
        setTasks(JSON.parse(cachedTasks));
      } catch (e) {
        console.error("Failed to parse cached tasks:", e);
      }
    }
    
    // Load projects using backend API (handles both individual + group projects)
    if (user) {
      loadAvailableProjects();
      
      // Poll for updates every 15 seconds
      const pollInterval = setInterval(() => {
        loadAvailableProjects();
      }, 15000);
      
      return () => clearInterval(pollInterval);
    } else {
      setAvailableProjects([]);
      setLoadingProjects(false);
    }
  }, [user]);

  const loadAvailableProjects = async (forceRefresh = false) => {
    if (!user) {
      setAvailableProjects([]);
      setLoadingProjects(false);
      return;
    }
    
    const cacheKey = `projects_${user.uid}`;
    const cacheTimeKey = `${cacheKey}_time`;
    const CACHE_DURATION = 60000; // 60 seconds
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);
      
      if (cachedData && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < CACHE_DURATION) {
          try {
            const projects = JSON.parse(cachedData);
            setAvailableProjects(projects);
            setLoadingProjects(false);
            
            // Update current project
            const savedProjectId = localStorage.getItem("currentProjectId");
            if (savedProjectId) {
              const currentProject = projects.find(p => p.id === savedProjectId);
              if (currentProject) {
                // Only update tasks if they haven't been modified recently
                const timeSinceLastUpdate = Date.now() - lastTaskUpdate;
                if (timeSinceLastUpdate > 5000) {
                  setTasks(currentProject.tasks || []);
                }
              }
            }
            return;
          } catch (e) {
            console.error("Cache parse error:", e);
          }
        }
      }
    }
    
    // Fetch from backend
    setLoadingProjects(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/projects?userId=${user.uid}&limit=20`);
      const projects = response.data.projects || [];
      
      setAvailableProjects(projects);
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(projects));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
      
      // Update current project
      const savedProjectId = localStorage.getItem("currentProjectId");
      if (savedProjectId) {
        const currentProject = projects.find(p => p.id === savedProjectId);
        if (currentProject) {
          // Only update tasks if they haven't been modified recently (avoid overwriting drag-drop changes)
          const timeSinceLastUpdate = Date.now() - lastTaskUpdate;
          if (timeSinceLastUpdate > 5000) { // 5 second grace period
            setTasks(currentProject.tasks || []);
            localStorage.setItem("tasks", JSON.stringify(currentProject.tasks || []));
          }
        }
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      
      // Fallback to cache on error
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          setAvailableProjects(JSON.parse(cachedData));
        } catch (e) {
          console.error("Failed to parse cached projects:", e);
        }
      }
    } finally {
      setLoadingProjects(false);
    }
  };
  
  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    if (!projectId) {
      // Clear tasks when deselecting project
      setTasks([]);
      setCurrentProjectId("");
      setCurrentProjectTitle("");
      localStorage.removeItem("currentProjectId");
      localStorage.removeItem("currentProjectTitle");
      localStorage.removeItem("tasks");
      return;
    }
    
    const project = availableProjects.find(p => p.id === projectId);
    if (project) {
      setCurrentProjectId(project.id);
      setCurrentProjectTitle(project.title);
      
      // Save to localStorage
      localStorage.setItem("currentProjectId", project.id);
      localStorage.setItem("currentProjectTitle", project.title);
      
      // Fix any tasks with invalid status values (data migration)
      const fixedTasks = (project.tasks || []).map(task => {
        const fixed = { ...task };
        
        // Fix status field
        if (!fixed.status || fixed.status === "in" || fixed.status === "progress") {
          fixed.status = "in-progress"; // Default broken statuses to in-progress
        } else if (fixed.status !== "todo" && fixed.status !== "in-progress" && fixed.status !== "done") {
          // If status is completely invalid, default to todo
          fixed.status = "todo";
        }
        
        // Ensure assignedTo exists
        if (!fixed.assignedTo) {
          fixed.assignedTo = "Unassigned";
        }
        
        return fixed;
      });
      
      // Load fixed tasks
      setTasks(fixedTasks);
      localStorage.setItem("tasks", JSON.stringify(fixedTasks));
    }
  };

  // Define columns based on view mode
  const getColumns = () => {
    if (viewMode === "status") {
      return [
        { id: "todo", title: "📝 To Do" },
        { id: "in-progress", title: "⚡ In Progress" },
        { id: "done", title: "✅ Done" },
      ];
    } else if (viewMode === "user") {
      // User view mode - get unique assignees, excluding status values
      const statusValues = ["todo", "in-progress", "done"];
      let assignees = [...new Set(tasks.map(t => t.assignedTo).filter(a => a && !statusValues.includes(a)))];
      
      // If user filter is active, show only that user's column
      if (filterUser) {
        assignees = assignees.filter(a => a === filterUser);
      }
      
      return assignees.map(assignee => ({
        id: assignee,
        title: `👤 ${assignee}`,
      }));
    } else {
      // user-status view: Group by user, then by status within each user
      const statusValues = ["todo", "in-progress", "done"];
      let assignees = [...new Set(tasks.map(t => t.assignedTo).filter(a => a && !statusValues.includes(a)))];
      
      // If user filter is active, show only that user's columns
      if (filterUser) {
        assignees = assignees.filter(a => a === filterUser);
      }
      
      const columns = [];
      
      assignees.forEach(assignee => {
        columns.push(
          { id: `${assignee}-todo`, title: "📝 To Do", user: assignee, status: "todo" },
          { id: `${assignee}-in-progress`, title: "⚡ In Progress", user: assignee, status: "in-progress" },
          { id: `${assignee}-done`, title: "✅ Done", user: assignee, status: "done" }
        );
      });
      
      return columns;
    }
  };

  const columns = getColumns();

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const tid = draggableId;
    const taskIndex = tasks.findIndex((t) => String(t.id) === String(tid));
    
    if (taskIndex === -1) {
      console.error("Task not found:", tid);
      return;
    }
    
    const task = tasks[taskIndex];

    // Create updated task based on view mode
    let updatedTask;
    if (viewMode === "status") {
      updatedTask = { ...task, status: destination.droppableId };
      if (!updatedTask.assignedTo) {
        updatedTask.assignedTo = user?.username || user?.email || "Unassigned";
      }
    } else if (viewMode === "user") {
      updatedTask = { ...task, assignedTo: destination.droppableId };
      if (!updatedTask.status) {
        updatedTask.status = "todo";
      }
    } else {
      // user-status view: Extract user and status from column ID
      const firstHyphenIndex = destination.droppableId.indexOf('-');
      const destUser = destination.droppableId.substring(0, firstHyphenIndex);
      const destStatus = destination.droppableId.substring(firstHyphenIndex + 1);
      updatedTask = { ...task, assignedTo: destUser, status: destStatus };
    }

    const groupKey = viewMode === "status" ? "status" : (viewMode === "user" ? "assignedTo" : "user-status");
    
    const newTasks = Array.from(tasks);
    newTasks.splice(taskIndex, 1);
    
    // Get tasks in the destination column
    let destColumnTasks;
    if (viewMode === "user-status") {
      const firstHyphenIndex = destination.droppableId.indexOf('-');
      const destUser = destination.droppableId.substring(0, firstHyphenIndex);
      const destStatus = destination.droppableId.substring(firstHyphenIndex + 1);
      destColumnTasks = newTasks.filter(t => t.assignedTo === destUser && t.status === destStatus);
    } else {
      destColumnTasks = newTasks.filter(t => t[groupKey] === destination.droppableId);
    }
    
    // Find where to insert in the full array
    if (destColumnTasks.length === 0) {
      // Destination column is empty, add at the end
      newTasks.push(updatedTask);
    } else {
      // Find the position of the destination index task in the full array
      let insertPosition;
      if (destination.index >= destColumnTasks.length) {
        // Insert after the last task in destination column
        const lastDestTask = destColumnTasks[destColumnTasks.length - 1];
        insertPosition = newTasks.findIndex(t => String(t.id) === String(lastDestTask.id)) + 1;
      } else {
        // Insert before the task at destination.index
        const taskAtDestIndex = destColumnTasks[destination.index];
        insertPosition = newTasks.findIndex(t => String(t.id) === String(taskAtDestIndex.id));
      }
      newTasks.splice(insertPosition, 0, updatedTask);
    }
    
    // Immediately update UI for better UX
    setTasks(newTasks);
    setLastTaskUpdate(Date.now());
    localStorage.setItem("tasks", JSON.stringify(newTasks));
    
    if (currentProjectId) {
      setAvailableProjects(prev => 
        prev.map(p => p.id === currentProjectId ? { ...p, tasks: newTasks } : p)
      );
      
      // Update cache to prevent polling from overwriting
      const cacheKey = `projects_${user.uid}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const projects = JSON.parse(cachedData);
          const updatedProjects = projects.map(p => 
            p.id === currentProjectId ? { ...p, tasks: newTasks } : p
          );
          localStorage.setItem(cacheKey, JSON.stringify(updatedProjects));
        } catch (e) {
          console.error("Failed to update cache:", e);
        }
      }
    }

    // Update backend asynchronously (don't wait for response)
    const updateData = {
      status: updatedTask.status,
      assignedTo: updatedTask.assignedTo
    };
    
    axios.patch(`${BACKEND_URL}/api/tasks/${tid}`, updateData)
      .then(() => {
        console.log("✅ Task updated on backend");
      })
      .catch((err) => {
        console.error("❌ Failed to update task on backend:", err);
        // Optionally: Show error message to user
      });
  };

  const tasksByColumn = (colId) => {
    let filteredTasks = [];
    
    if (viewMode === "status") {
      filteredTasks = tasks.filter((t) => t.status === colId);
    } else if (viewMode === "user") {
      filteredTasks = tasks.filter((t) => t.assignedTo === colId);
    } else {
      // user-status view: Filter by both user and status
      // Split only on the first hyphen to handle statuses like "in-progress"
      const firstHyphenIndex = colId.indexOf('-');
      const colUser = colId.substring(0, firstHyphenIndex);
      const colStatus = colId.substring(firstHyphenIndex + 1);
      filteredTasks = tasks.filter((t) => t.assignedTo === colUser && t.status === colStatus);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter((t) => 
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.assignedTo && t.assignedTo.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (filterStatus) {
      filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
    }

    // Apply user filter
    if (filterUser) {
      filteredTasks = filteredTasks.filter(t => t.assignedTo === filterUser);
    }
    
    // Debug: Log task order before sorting
    console.log('🔍 Before sorting:', filteredTasks.map(t => `#${t.sequence}: ${t.title?.substring(0, 40)}...`));
    
    // Sort tasks by sequence number first (to preserve workflow order), then by priority
    // If no sequence field exists (old projects), preserve order received from backend
    filteredTasks.sort((a, b) => {
      // Primary sort: sequence number (if available)
      const aSeq = a.sequence;
      const bSeq = b.sequence;
      
      // If both have sequence numbers, sort by them
      if (aSeq !== undefined && bSeq !== undefined) {
        if (aSeq !== bSeq) {
          return aSeq - bSeq;
        }
      }
      
      // If only one has sequence, prioritize it
      if (aSeq !== undefined && bSeq === undefined) return -1;
      if (aSeq === undefined && bSeq !== undefined) return 1;
      
      // If neither has sequence, sort by ID (preserves creation order)
      const aId = typeof a.id === 'number' ? a.id : parseInt(a.id) || 0;
      const bId = typeof b.id === 'number' ? b.id : parseInt(b.id) || 0;
      if (aId !== bId) {
        return aId - bId;
      }
      
      // Final fallback: priority (High -> Medium -> Low)
      const priorityOrder = { 'High': 0, 'high': 0, 'Medium': 1, 'medium': 1, 'Low': 2, 'low': 2 };
      const aPriority = priorityOrder[a.priority] ?? 3;
      const bPriority = priorityOrder[b.priority] ?? 3;
      return aPriority - bPriority;
    });
    
    return filteredTasks;
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleSaveTask = async (updatedTask) => {
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setTasks(newTasks);
    setLastTaskUpdate(Date.now());
    localStorage.setItem("tasks", JSON.stringify(newTasks));
    
    // Update in Firebase if project exists
    if (currentProjectId) {
      try {
        await axios.patch(`${BACKEND_URL}/api/tasks/${updatedTask.id}`, updatedTask);
        console.log("✅ Task updated in Firebase");
      } catch (err) {
        console.error("⚠️ Failed to update task in Firebase:", err);
      }
    }
    
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    setLastTaskUpdate(Date.now());
    localStorage.setItem("tasks", JSON.stringify(newTasks));
    
    // Update available projects
    if (currentProjectId) {
      setAvailableProjects(prev =>
        prev.map(p => p.id === currentProjectId ? { ...p, tasks: newTasks } : p)
      );
    }

    // Delete from Firebase
    if (currentProjectId) {
      try {
        await axios.delete(`${BACKEND_URL}/api/tasks/${taskId}`);
        console.log("✅ Task deleted from Firebase");
      } catch (err) {
        console.error("⚠️ Failed to delete task from Firebase:", err);
      }
    }
    
    setEditingTask(null);
  };

  const handleAddTask = async (newTask) => {
    if (!currentProjectId) {
      alert("Please select a project first");
      return;
    }

    try {
      // Add task to Firebase
      const response = await axios.post(
        `${BACKEND_URL}/api/projects/${currentProjectId}/tasks`,
        newTask
      );

      const taskWithId = { ...newTask, id: response.data.taskId };
      const updatedTasks = [...tasks, taskWithId];
      
      setTasks(updatedTasks);
      setLastTaskUpdate(Date.now());
      localStorage.setItem("tasks", JSON.stringify(updatedTasks));
      
      // Update available projects
      setAvailableProjects(prev =>
        prev.map(p => p.id === currentProjectId ? { ...p, tasks: updatedTasks } : p)
      );
      
      setShowAddTaskModal(false);
      console.log("✅ Task added successfully");
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task");
    }
  };

  return (
    <div className="page dashboard-page">
      <div className="dashboard-container">
        {/* Left Sidebar - Project Explorer + Task Stats */}
        <aside className="dashboard-sidebar">
          {/* Project Explorer */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h3 className="sidebar-title">📂 Projects</h3>
              <button 
                className="btn-icon-small"
                onClick={() => loadAvailableProjects(true)}
                disabled={loadingProjects}
                title="Refresh projects"
              >
                🔄
              </button>
            </div>

            {/* Individual Projects */}
            {availableProjects.filter(p => !p.groupId).length > 0 && (
              <div className="project-group">
                <div className="project-group-label">👤 Individual</div>
                {availableProjects.filter(p => !p.groupId).map((project) => (
                  <button
                    key={project.id}
                    className={`project-item ${currentProjectId === project.id ? 'active' : ''}`}
                    onClick={() => {
                      const e = { target: { value: project.id } };
                      handleProjectChange(e);
                    }}
                  >
                    <span className="project-item-name">{project.title}</span>
                    <span className="project-item-count">{project.tasks?.length || 0}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Group Projects */}
            {availableProjects.filter(p => p.groupId).length > 0 && (
              <div className="project-group">
                <div className="project-group-label">👥 Group</div>
                {availableProjects.filter(p => p.groupId).map((project) => (
                  <button
                    key={project.id}
                    className={`project-item ${currentProjectId === project.id ? 'active' : ''}`}
                    onClick={() => {
                      const e = { target: { value: project.id } };
                      handleProjectChange(e);
                    }}
                  >
                    <span className="project-item-name">{project.title}</span>
                    <span className="project-item-count">{project.tasks?.length || 0}</span>
                  </button>
                ))}
              </div>
            )}

            {availableProjects.length === 0 && (
              <div className="empty-projects">
                <p>No projects yet</p>
                <small>Create one from Home</small>
              </div>
            )}
          </div>

          {/* Task Statistics */}
          {currentProjectId && (
            <div className="sidebar-section task-stats-section">
              <h3 className="sidebar-title">📋 Task Overview</h3>
              
              <div className="task-stats-grid">
                <div className="task-stat-card">
                  <div className="task-stat-value">{tasks.length}</div>
                  <div className="task-stat-label">Total</div>
                </div>
                <div className="task-stat-card">
                  <div className="task-stat-value">{tasks.filter(t => t.status === 'todo').length}</div>
                  <div className="task-stat-label">To Do</div>
                </div>
                <div className="task-stat-card">
                  <div className="task-stat-value">{tasks.filter(t => t.status === 'in-progress').length}</div>
                  <div className="task-stat-label">In Progress</div>
                </div>
                <div className="task-stat-card">
                  <div className="task-stat-value">{tasks.filter(t => t.status === 'done').length}</div>
                  <div className="task-stat-label">Done</div>
                </div>
              </div>

              <div className="circular-progress-container">
                <svg className="circular-progress" viewBox="0 0 200 200">
                  {(() => {
                    const todoCount = tasks.filter(t => t.status === 'todo').length;
                    const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
                    const doneCount = tasks.filter(t => t.status === 'done').length;
                    const total = tasks.length;
                    
                    if (total === 0) {
                      return (
                        <>
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="var(--border)"
                            strokeWidth="20"
                          />
                          <text
                            x="100"
                            y="100"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="progress-text"
                          >
                            0%
                          </text>
                        </>
                      );
                    }
                    
                    const todoPercent = (todoCount / total) * 100;
                    const inProgressPercent = (inProgressCount / total) * 100;
                    const donePercent = (doneCount / total) * 100;
                    
                    const circumference = 2 * Math.PI * 80;
                    const todoLength = (todoPercent / 100) * circumference;
                    const inProgressLength = (inProgressPercent / 100) * circumference;
                    const doneLength = (donePercent / 100) * circumference;
                    
                    let offset = 0;
                    
                    return (
                      <>
                        {/* To Do - Red/Orange */}
                        {todoCount > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="20"
                            strokeDasharray={`${todoLength} ${circumference}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 100 100)"
                            className="progress-segment"
                          />
                        )}
                        {/* In Progress - Blue */}
                        {inProgressCount > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="20"
                            strokeDasharray={`${inProgressLength} ${circumference}`}
                            strokeDashoffset={-(offset + todoLength)}
                            transform="rotate(-90 100 100)"
                            className="progress-segment"
                          />
                        )}
                        {/* Done - Green */}
                        {doneCount > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="20"
                            strokeDasharray={`${doneLength} ${circumference}`}
                            strokeDashoffset={-(offset + todoLength + inProgressLength)}
                            transform="rotate(-90 100 100)"
                            className="progress-segment"
                          />
                        )}
                        <text
                          x="100"
                          y="100"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="progress-text"
                        >
                          {Math.round(donePercent)}%
                        </text>
                      </>
                    );
                  })()}
                </svg>
                <div className="circular-progress-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                    <span className="legend-label">To Do ({tasks.filter(t => t.status === 'todo').length})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span>
                    <span className="legend-label">In Progress ({tasks.filter(t => t.status === 'in-progress').length})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
                    <span className="legend-label">Done ({tasks.filter(t => t.status === 'done').length})</span>
                  </div>
                </div>
              </div>

              <button 
                className="btn-add-task-sidebar"
                onClick={() => setShowAddTaskModal(true)}
              >
                ➕ Add Task
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="dashboard-main">
          {/* Top Toolbar */}
          <div className="dashboard-toolbar">
            <div className="toolbar-left">
              <h2 className="dashboard-title">
                {currentProjectTitle || '📊 Dashboard'}
              </h2>
            </div>

            <div className="toolbar-center">
              {/* View Mode Toggle - Moved to left side */}
              <div className="view-mode-toggle">
                <button
                  className={`toggle-btn ${viewMode === "user-status" ? "active" : ""}`}
                  onClick={() => setViewMode("user-status")}
                  title="View by User & Status"
                >
                  👥 By User
                </button>
                <button
                  className={`toggle-btn ${viewMode === "status" ? "active" : ""}`}
                  onClick={() => setViewMode("status")}
                  title="View by Status Only"
                >
                  📋 By Status
                </button>
              </div>

              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>

              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="filter-select"
              >
                <option value="">All Users</option>
                {[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))].map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>

              {(searchQuery || filterStatus || filterUser) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("");
                    setFilterUser("");
                  }}
                  className="btn-clear-filters"
                  title="Clear all filters"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

      {/* Guest Mode Notice */}
      {!user && (
        <div className="guest-notice">
          ℹ️ <strong>Guest Mode:</strong> Changes won't be saved. <a href="/login">Login</a> to save your work.
        </div>
      )}

      {/* Empty State - First Time User Guide */}
      {tasks.length === 0 && currentProjectId && (
        <div className="empty-board-guide">
          <div className="empty-guide-icon">🚀</div>
          <h3 className="empty-guide-title">Welcome! Let's Get Started</h3>
          <p className="empty-guide-subtitle">Follow these simple steps to manage your project:</p>
          
          <div className="empty-guide-steps">
            <div className="empty-step">
              <div className="empty-step-number">1</div>
              <div className="empty-step-content">
                <div className="empty-step-title">Create Your First Task</div>
                <div className="empty-step-description">
                  Click the <strong>"Add Task"</strong> button in the left sidebar to create a new task
                </div>
              </div>
            </div>
            
            <div className="empty-step">
              <div className="empty-step-number">2</div>
              <div className="empty-step-content">
                <div className="empty-step-title">Assign Team Members</div>
                <div className="empty-step-description">
                  Give each task to a team member so everyone knows their responsibilities
                </div>
              </div>
            </div>
            
            <div className="empty-step">
              <div className="empty-step-number">3</div>
              <div className="empty-step-content">
                <div className="empty-step-title">Track Progress</div>
                <div className="empty-step-description">
                  Move tasks through <strong>To Do → In Progress → Done</strong> as you work
                </div>
              </div>
            </div>
          </div>
          
          <button 
            className="empty-guide-cta"
            onClick={() => setShowAddTaskModal(true)}
          >
            ➕ Create Your First Task
          </button>
        </div>
      )}

      {/* No Project Selected */}
      {!currentProjectId && (
        <div className="empty-board-guide">
          <div className="empty-guide-icon">📂</div>
          <h3 className="empty-guide-title">Select a Project to Begin</h3>
          <p className="empty-guide-subtitle">Choose a project from the dropdown above to view and manage tasks</p>
        </div>
      )}

      {/* Only show board when project is selected */}
      {currentProjectId && (
      <div className="board-wrap" key={`board-${viewMode}`}>
        <DragDropContext onDragEnd={onDragEnd}>
          {viewMode === "user-status" ? (
            // User-Status grouped view
            <div className="user-grouped-board">
              {(() => {
                // Get all unique assignees, filtered by user filter if set
                let allAssignees = [...new Set(tasks.map(t => t.assignedTo).filter(a => a && !["todo", "in-progress", "done"].includes(a)))];
                
                // If user filter is active, show only that user's kanban
                if (filterUser) {
                  allAssignees = allAssignees.filter(a => a === filterUser);
                }
                
                return allAssignees.map(assignee => (
                  <div key={assignee} className="user-group">
                    <div className="user-group-header">
                      <h3 className="user-group-title">👤 {assignee}</h3>
                      <span className="user-task-count">
                        {tasks.filter(t => t.assignedTo === assignee).length} task{tasks.filter(t => t.assignedTo === assignee).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="user-status-columns">
                      {[
                        { id: `${assignee}-todo`, title: "📝 To Do", status: "todo" },
                        { id: `${assignee}-in-progress`, title: "⚡ In Progress", status: "in-progress" },
                        { id: `${assignee}-done`, title: "✅ Done", status: "done" }
                      ].map(col => (
                        <Column 
                          key={col.id}
                          columnId={col.id} 
                          title={col.title} 
                          tasks={tasksByColumn(col.id)}
                          viewMode={viewMode}
                          user={user}
                          onEditTask={handleEditTask}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            // Regular board view
            <div className="board" style={{ 
              gridTemplateColumns: `repeat(${columns.length}, 1fr)` 
            }}>
              {columns.length === 0 && viewMode === "user" ? (
                <div className="empty-state">
                  <p>No team members assigned to tasks yet.</p>
                  <p>Generate tasks or add team members to see columns.</p>
                </div>
              ) : (
                columns.map((c) => (
                  <Column 
                    key={`${viewMode}-${c.id}`}
                    columnId={c.id} 
                    title={c.title} 
                    tasks={tasksByColumn(c.id)}
                    viewMode={viewMode}
                    user={user}
                    onEditTask={handleEditTask}
                  />
                ))
              )}
            </div>
          )}
        </DragDropContext>
      </div>
      )}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          teamMembers={[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))]}
        />
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal
          onClose={() => setShowAddTaskModal(false)}
          onSave={handleAddTask}
          teamMembers={[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))]}
        />
      )}
    </div>
  );
}
