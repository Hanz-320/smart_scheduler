import React, { useState, useEffect } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import Column from "../components/Column";
import EditTaskModal from "../components/EditTaskModal";
import AddTaskModal from "../components/AddTaskModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import Notification from "../components/Notification";
import { Link } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:5000";

export default function Dashboard({ tasks, setTasks, user }) {
  // If user is a guest, force status view. Otherwise, use saved preference or default.
  const [viewMode, setViewMode] = useState(() => {
    if (!user) return "status";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteNotification, setShowDeleteNotification] = useState(false);
  const [showEditNotification, setShowEditNotification] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [projectStatus, setProjectStatus] = useState(null);
  const [generationError, setGenerationError] = useState("");

  // Save view mode preference for logged-in users
  useEffect(() => {
    if (user) {
      localStorage.setItem("dashboardViewMode", viewMode);
    }
  }, [viewMode, user]);

  useEffect(() => {
    const savedProjectId = localStorage.getItem("currentProjectId");
    if (savedProjectId) {
      setCurrentProjectId(savedProjectId);
      const savedTitle = localStorage.getItem("currentProjectTitle");
      if (savedTitle) setCurrentProjectTitle(savedTitle);
    }
    if (user) {
      // Clear old cache keys to force refresh with new taskCount data
      const oldCacheKey = `projects_list_${user.uid}`;
      localStorage.removeItem(oldCacheKey);
      localStorage.removeItem(`${oldCacheKey}_time`);
      
      // Force refresh on mount to get latest task counts
      loadAvailableProjects(true);
    } else {
      setCurrentProjectId(null);
    }
  }, [user]);

  useEffect(() => {
    // This effect is for polling the status of a generating project.
    if (projectStatus === 'generating' && currentProjectId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/projects/${currentProjectId}/status`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const { status, error } = await response.json();

          if (status === 'completed') {
            clearInterval(interval);
            setProjectStatus('completed');
            // Force a refresh of the project list and then reload the tasks for the now-completed project
            await loadAvailableProjects(true); 
            handleProjectChange({ target: { value: currentProjectId } });
          } else if (status === 'failed') {
            clearInterval(interval);
            setProjectStatus('failed');
            setGenerationError(error || "Unknown error during generation.");
            console.error("Project generation failed:", error);
          }
          // If still 'generating', do nothing and let the interval run again.
        } catch (err) {
          clearInterval(interval);
          setProjectStatus('failed');
          setGenerationError("Could not get project status from the server.");
          console.error("Polling error:", err);
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval); // Cleanup on component unmount or status change
    }
  }, [projectStatus, currentProjectId]);

  useEffect(() => {
    // When the project changes, close any open edit modal to prevent state mismatches
    setEditingTask(null);
  }, [currentProjectId]);

  const loadAvailableProjects = async (forceRefresh = false) => {
    if (!user) {
      setAvailableProjects([]);
      setLoadingProjects(false);
      return;
    }
    
    // Check cache first
    const cacheKey = `projects_list_${user.uid}_v2`; // v2 to invalidate old cache
    const cacheTimeKey = `${cacheKey}_time`;
    const CACHE_DURATION = 300000; // 5 minutes
    
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);
      
      if (cachedData && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < CACHE_DURATION) {
          const projects = JSON.parse(cachedData);
          setAvailableProjects(projects);
          
          // Check status of current project if exists
          if (currentProjectId) {
            const currentProject = projects.find(p => p.id === currentProjectId);
            if (currentProject) {
              setProjectStatus(currentProject.status || 'completed');
            }
          }
          setLoadingProjects(false);
          return;
        }
      }
    }
    
    setLoadingProjects(true);
    try {
      // Load projects WITHOUT tasks for faster initial load
      const response = await fetch(`${BACKEND_URL}/api/projects?userId=${user.uid}&limit=20&includeTasks=false`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const projects = data.projects || [];
      
      // Cache the projects list
      localStorage.setItem(cacheKey, JSON.stringify(projects));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
      
      setAvailableProjects(projects);

      // Check status of current project if exists
      if (currentProjectId) {
        const currentProject = projects.find(p => p.id === currentProjectId);
        if (currentProject) {
          if(currentProject.status === 'generating') {
            setProjectStatus('generating');
            setTasks([]);
          } else {
            setProjectStatus(currentProject.status || 'completed');
          }
        }
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };
  
  const invalidateTasksCache = (projectId) => {
    const tasksCacheKey = `project_tasks_${projectId}`;
    const tasksCacheTimeKey = `${tasksCacheKey}_time`;
    localStorage.removeItem(tasksCacheKey);
    localStorage.removeItem(tasksCacheTimeKey);
  };

  const handleProjectChange = async (e) => {
    const projectId = e.target.value;
    if (!projectId) {
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
      localStorage.setItem("currentProjectId", project.id);
      localStorage.setItem("currentProjectTitle", project.title);
    }

    const tasksCacheKey = `project_tasks_${projectId}`;
    const tasksCacheTimeKey = `${tasksCacheKey}_time`;
    const TASKS_CACHE_DURATION = 300000; // 5 minutes

    // Get from cache first
    const cachedTasks = localStorage.getItem(tasksCacheKey);
    const cacheTime = localStorage.getItem(tasksCacheTimeKey);

    if (cachedTasks && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < TASKS_CACHE_DURATION) {
        setTasks(JSON.parse(cachedTasks));
        return; // Use cached data
      }
    }

    // Fetch fresh data
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const freshTasks = (data.tasks || []).map(task => ({
        ...task,
        status: ["todo", "in-progress", "done"].includes(task.status) ? task.status : "todo",
        assignedTo: task.assignedTo || "Unassigned",
      }));

      setTasks(freshTasks);
      localStorage.setItem(tasksCacheKey, JSON.stringify(freshTasks));
      localStorage.setItem(tasksCacheTimeKey, Date.now().toString());
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const getColumns = () => {
    const effectiveViewMode = user ? viewMode : "status";

    if (effectiveViewMode === "status") {
      return [
        { id: "todo", title: "📝 To Do" },
        { id: "in-progress", title: "⚡ In Progress" },
        { id: "done", title: "✅ Done" },
      ];
    }
    
    if (effectiveViewMode === "user") {
      let assignees = [...new Set(tasks.map(t => t.assignedTo).filter(a => a && !["todo", "in-progress", "done"].includes(a)))];
      if (filterUser) assignees = assignees.filter(a => a === filterUser);
      return assignees.map(assignee => ({ id: assignee, title: `👤 ${assignee}` }));
    } 
    
    // user-status view
    let assignees = [...new Set(tasks.map(t => t.assignedTo).filter(a => a && !["todo", "in-progress", "done"].includes(a)))];
    if (filterUser) assignees = assignees.filter(a => a === filterUser);
    
    const columns = [];
    assignees.forEach(assignee => {
      columns.push(
        { id: `${assignee}-todo`, title: "📝 To Do", user: assignee, status: "todo" },
        { id: `${assignee}-in-progress`, title: "⚡ In Progress", user: assignee, status: "in-progress" },
        { id: `${assignee}-done`, title: "✅ Done", user: assignee, status: "done" }
      );
    });
    return columns;
  };

  const columns = getColumns();

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const task = tasks.find((t) => String(t.id) === String(draggableId));
    if (!task) return;

    const effectiveViewMode = user ? viewMode : "status";
    let updatedTask = { ...task };

    if (effectiveViewMode === "status") {
      updatedTask.status = destination.droppableId;
    } else if (effectiveViewMode === "user") {
      updatedTask.assignedTo = destination.droppableId;
    } else { // user-status
      const firstHyphenIndex = destination.droppableId.indexOf('-');
      updatedTask.assignedTo = destination.droppableId.substring(0, firstHyphenIndex);
      updatedTask.status = destination.droppableId.substring(firstHyphenIndex + 1);
    }

    const newTasks = tasks.map(t => (String(t.id) === String(draggableId) ? updatedTask : t));
    setTasks(newTasks);
    setLastTaskUpdate(Date.now());
    localStorage.setItem("tasks", JSON.stringify(newTasks));
    invalidateTasksCache(currentProjectId);

    if (user && currentProjectId) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/tasks/${draggableId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: updatedTask.status, assignedTo: updatedTask.assignedTo }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (err) {
        console.error("❌ Failed to update task on backend:", err);
        // If the API call fails, revert the UI to its previous state
        setTasks(tasks);
        localStorage.setItem("tasks", JSON.stringify(tasks));
      }
    }
  };

  const tasksByColumn = (colId) => {
    const effectiveViewMode = user ? viewMode : "status";
    let filteredTasks = [];

    if (effectiveViewMode === "status") {
      filteredTasks = tasks.filter((t) => t.status === colId);
    } else if (effectiveViewMode === "user") {
      filteredTasks = tasks.filter((t) => t.assignedTo === colId);
    } else {
      const firstHyphenIndex = colId.indexOf('-');
      const colUser = colId.substring(0, firstHyphenIndex);
      const colStatus = colId.substring(firstHyphenIndex + 1);
      filteredTasks = tasks.filter((t) => t.assignedTo === colUser && t.status === colStatus);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter((t) => 
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.assignedTo && t.assignedTo.toLowerCase().includes(query))
      );
    }

    if (user && filterStatus) filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
    if (user && filterUser) filteredTasks = filteredTasks.filter(t => t.assignedTo === filterUser);
    
    return filteredTasks.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  };

  const handleEditTask = (task) => setEditingTask(task);

  const handleSaveTask = async (updatedTask) => {
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setTasks(newTasks);
    setLastTaskUpdate(Date.now());
    localStorage.setItem("tasks", JSON.stringify(newTasks));
    
    if (user && currentProjectId) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/tasks/${updatedTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedTask),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setShowEditNotification(true);
        invalidateTasksCache(currentProjectId);
      } catch (err) { console.error("⚠️ Failed to update task in Firebase:", err); }
    }
    setEditingTask(null);
  };

  const handleDeleteTask = (task) => {
    setEditingTask(null); // This line is added to close the edit modal
    setTaskToDelete(task);
  };

  const confirmDeleteTask = async (task) => {
    console.log("Attempting to delete task. Current task to delete:", task);
    console.log("Current tasks in state:", tasks);
    if (!task) return;

    if (user && currentProjectId) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/projects/${currentProjectId}/tasks/${task.id}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Update state only after successful deletion
            const newTasks = tasks.filter(t => t.id !== task.id);
            setTasks(newTasks);
            setLastTaskUpdate(Date.now());
            localStorage.setItem("tasks", JSON.stringify(newTasks));
            invalidateTasksCache(currentProjectId);
            loadAvailableProjects(true); // Refresh the project list
            
            setEditingTask(null);
            setTaskToDelete(null);

        } catch (err) {
            console.error("⚠️ Failed to delete task from Firebase:", err);
            // Optionally, show an error message to the user
            alert("Failed to delete task. Please try again.");
        }
    } else {
        // Handle guest user case (no backend)
        const newTasks = tasks.filter(t => t.id !== task.id);
        setTasks(newTasks);
        setLastTaskUpdate(Date.now());
        localStorage.setItem("tasks", JSON.stringify(newTasks));
        setEditingTask(null);
        setTaskToDelete(null);
    }
  };

  const handleAddTask = async (newTask) => {
    if (!currentProjectId) {
      alert("Please select a project first");
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${currentProjectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const taskWithId = { ...newTask, id: data.taskId };
      const updatedTasks = [...tasks, taskWithId];
      setTasks(updatedTasks);
      setLastTaskUpdate(Date.now());
      localStorage.setItem("tasks", JSON.stringify(updatedTasks));
      invalidateTasksCache(currentProjectId);
      setShowAddTaskModal(false);
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task");
    }
  };

  const handleDeleteProject = () => {
    if (!currentProjectId) {
      alert("No project selected to delete.");
      return;
    }
    if (!user) {
      alert("You must be logged in to delete a project.");
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${currentProjectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("✅ Project deleted from Firebase");
      
      const deletedProjectId = currentProjectId;

      // Clear current project state
      setCurrentProjectId("");
      setCurrentProjectTitle("");
      setTasks([]);
      localStorage.removeItem("currentProjectId");
      localStorage.removeItem("currentProjectTitle");
      localStorage.removeItem("tasks");

      // Update available projects list
      setAvailableProjects(prev => prev.filter(p => p.id !== deletedProjectId));

      // Invalidate cache for projects
      localStorage.removeItem(`projects_${user.uid}`);
      localStorage.removeItem(`projects_${user.uid}_time`);

    } catch (err) {
      console.error("⚠️ Failed to delete project from Firebase:", err);
      alert("Failed to delete project. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setShowDeleteNotification(true);
    }
  }; // Closing brace for confirmDeleteProject function

  const renderContent = () => {
    if (projectStatus === 'generating') {
      return (
        <div className="empty-board-guide">
          <div className="empty-guide-icon">⏳</div>
          <h3 className="empty-guide-title">AI is Generating Your Project</h3>
          <p className="empty-guide-subtitle">Your tasks will appear here shortly. This may take up to a minute.</p>
          <div className="spinner" />
        </div>
      );
    }

    if (projectStatus === 'failed') {
      return (
        <div className="empty-board-guide">
          <div className="empty-guide-icon">❌</div>
          <h3 className="empty-guide-title">Project Generation Failed</h3>
          <p className="empty-guide-subtitle" style={{color: 'var(--danger)'}}>{generationError}</p>
          <p className="empty-guide-subtitle">Please try generating the project again from the Home page.</p>
        </div>
      );
    }

    if ((user && currentProjectId) || (!user && tasks.length > 0)) {
      return (
        <div className="board-wrap" key={`board-${viewMode}`}>
          <DragDropContext onDragEnd={onDragEnd}>
            {viewMode === "user-status" && user ? (
              <div className="user-grouped-board">
                {(() => {
                  let allAssignees = [...new Set(tasks.map(t => t.assignedTo).filter(a => a && !["todo", "in-progress", "done"].includes(a)))];
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
                        {["todo", "in-progress", "done"].map(status => (
                          <Column 
                            key={`${assignee}-${status}`}
                            columnId={`${assignee}-${status}`} 
                            title={`📝 ${status.replace('-', ' ')}`} 
                            tasks={tasksByColumn(`${assignee}-${status}`)}
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
              <div className="board">
                {columns.length === 0 && viewMode === "user" && user ? (
                  <div className="empty-state"><p>No team members assigned to tasks yet.</p></div>
                ) : (
                  columns.map((c) => (
                    <Column 
                      key={`${viewMode}-${c.id}`}
                      columnId={c.id} 
                      title={c.title} 
                      tasks={tasksByColumn(c.id)}
                      viewMode={user ? viewMode : 'status'}
                      user={user}
                      onEditTask={handleEditTask}
                    />
                  ))
                )}
              </div>
            )}
          </DragDropContext>
        </div>
      )
    }

    return (
      <div className="empty-board-guide">
        {user ? (
          <><div className="empty-guide-icon">📂</div><h3 className="empty-guide-title">Select or Create a Project</h3><p className="empty-guide-subtitle">Choose a project from the sidebar, or create a new one from the Home page.</p></>
        ) : (
          <><div className="empty-guide-icon">🚀</div><h3 className="empty-guide-title">No tasks yet!</h3><p className="empty-guide-subtitle">Go to the <Link to="/" className="font-semibold text-indigo-400 hover:text-indigo-500">Home page</Link> to generate tasks.</p></>
        )}
      </div>
    )
  }

  return (
    <div className="page dashboard-page">
      <div className={`dashboard-container ${!user ? 'guest-mode' : ''}`}>
        {user && (
          <aside className="dashboard-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <h3 className="sidebar-title">📂 Projects</h3>
                <button className="btn-icon-small" onClick={() => loadAvailableProjects(true)} disabled={loadingProjects} title="Refresh projects">🔄</button>
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
                      <span className="project-item-count">{project.taskCount ?? project.tasks?.length ?? 0}</span>
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
                      <span className="project-item-count">{project.taskCount ?? project.tasks?.length ?? 0}</span>
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
                {user && ( // Only show delete button for logged-in users
                  <button 
                    className="btn btn-danger btn-delete-project-sidebar"
                    onClick={handleDeleteProject}
                  >
                    🗑️ Delete Project
                  </button>
                )}
              </div>
            )}
          </aside>
        )}

        <div className="dashboard-main">
          <div className="dashboard-toolbar">
            <div className="toolbar-left"><h2 className="dashboard-title">{currentProjectTitle || '📊 Dashboard'}</h2></div>
            <div className="toolbar-center">
              {user && (
                <div className="view-mode-toggle">
                  <button className={`toggle-btn ${viewMode === "user-status" ? "active" : ""}`} onClick={() => setViewMode("user-status")} title="View by User & Status">👥 By User</button>
                  <button className={`toggle-btn ${viewMode === "status" ? "active" : ""}`} onClick={() => setViewMode("status")} title="View by Status Only">📋 By Status</button>
                </div>
              )}
              <input type="text" placeholder="🔍 Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
              {user && (
                <>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                    <option value="">All Status</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="filter-select">
                    <option value="">All Users</option>
                    {[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))].map(u => (<option key={u} value={u}>{u}</option>))}
                  </select>
                </>
              )}
              {(searchQuery || filterStatus || filterUser) && (<button onClick={() => { setSearchQuery(""); setFilterStatus(""); setFilterUser(""); }} className="btn-clear-filters" title="Clear all filters">✕</button>)}
            </div>
          </div>

          {!user && (
            <div className="guest-notice">
              ℹ️ <strong>Guest Mode:</strong> Your board is temporary and will not be saved. <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-500">Login or Register</Link> to save your projects.
            </div>
          )}

          {renderContent()}
        </div>
      </div>

      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleSaveTask} onDelete={handleDeleteTask} teamMembers={user ? [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))] : []} />}
      {showAddTaskModal && user && <AddTaskModal onClose={() => setShowAddTaskModal(false)} onSave={handleAddTask} teamMembers={[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))]} />}
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteProject}
        message={<>Are you sure you want to permanently delete the project: <strong>{currentProjectTitle}</strong>?</>}
      />
      
      {taskToDelete && (
        <DeleteConfirmationModal
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={() => confirmDeleteTask(taskToDelete)}
          title="Confirm Task Deletion"
          message={<>Are you sure you want to permanently delete the task: <strong>{taskToDelete.title}</strong>?</>}
        />
      )}

      <Notification
        isOpen={showDeleteNotification}
        onClose={() => setShowDeleteNotification(false)}
        message="Project successfully deleted."
      />
      <Notification
        isOpen={showEditNotification}
        onClose={() => setShowEditNotification(false)}
        message="Task successfully updated."
      />
    </div>
  );
}