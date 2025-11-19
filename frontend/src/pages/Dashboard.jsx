import React, { useState, useEffect } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import Column from "../components/Column";
import EditTaskModal from "../components/EditTaskModal";
import AddTaskModal from "../components/AddTaskModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import Notification from "../components/Notification";
import axios from "axios";
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

  // Save view mode preference for logged-in users
  useEffect(() => {
    if (user) {
      localStorage.setItem("dashboardViewMode", viewMode);
    }
  }, [viewMode, user]);

  useEffect(() => {
    const savedTitle = localStorage.getItem("currentProjectTitle");
    if (savedTitle) setCurrentProjectTitle(savedTitle);

    if (user) {
      // Logged-in user logic
      const savedProjectId = localStorage.getItem("currentProjectId");
      if (savedProjectId) setCurrentProjectId(savedProjectId);
      
      loadAvailableProjects();
      const pollInterval = setInterval(() => loadAvailableProjects(), 15000);
      return () => clearInterval(pollInterval);
    } else {
      // Guest user logic is now simpler: just display tasks passed via props.
      // No need to load from localStorage here as it overwrites the state.
      setCurrentProjectId(null); // Ensure no project is selected
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
    
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);
      
      if (cachedData && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
        try {
          const projects = JSON.parse(cachedData);
          setAvailableProjects(projects);
          return;
        } catch (e) { console.error("Cache parse error:", e); }
      }
    }
    
    setLoadingProjects(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/projects?userId=${user.uid}&limit=20`);
      const projects = response.data.projects || [];
      setAvailableProjects(projects);
      localStorage.setItem(cacheKey, JSON.stringify(projects));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };
  
  const handleProjectChange = (e) => {
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
      
      const fixedTasks = (project.tasks || []).map(task => ({
        ...task,
        status: ["todo", "in-progress", "done"].includes(task.status) ? task.status : "todo",
        assignedTo: task.assignedTo || "Unassigned",
      }));
      
      setTasks(fixedTasks);
      localStorage.setItem("tasks", JSON.stringify(fixedTasks));
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

    if (user && currentProjectId) {
      axios.patch(`${BACKEND_URL}/api/tasks/${draggableId}`, { status: updatedTask.status, assignedTo: updatedTask.assignedTo })
        .catch(err => console.error("❌ Failed to update task on backend:", err));
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
        await axios.patch(`${BACKEND_URL}/api/tasks/${updatedTask.id}`, updatedTask);
      } catch (err) { console.error("⚠️ Failed to update task in Firebase:", err); }
    }
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    setLastTaskUpdate(Date.now());
    localStorage.setItem("tasks", JSON.stringify(newTasks));
    
    if (user && currentProjectId) {
      try {
        await axios.delete(`${BACKEND_URL}/api/tasks/${taskId}`);
      } catch (err) { console.error("⚠️ Failed to delete task from Firebase:", err); }
    }
    setEditingTask(null);
  };

  const handleAddTask = async (newTask) => {
    if (!currentProjectId) {
      alert("Please select a project first");
      return;
    }
    try {
      const response = await axios.post(`${BACKEND_URL}/api/projects/${currentProjectId}/tasks`, newTask);
      const taskWithId = { ...newTask, id: response.data.taskId };
      const updatedTasks = [...tasks, taskWithId];
      setTasks(updatedTasks);
      setLastTaskUpdate(Date.now());
      localStorage.setItem("tasks", JSON.stringify(updatedTasks));
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
      await axios.delete(`${BACKEND_URL}/api/projects/${currentProjectId}`);
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
  };

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

          {((user && currentProjectId) || (!user && tasks.length > 0)) ? (
            <div className="board-wrap" key={`board-${viewMode}`}>
              <DragDropContext onDragEnd={onDragEnd}>
                {viewMode === "user-status" && user ? (
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
                  // Regular board view (Status or User, and also for guests)
                  <div className="board">
                    {columns.length === 0 && viewMode === "user" && user ? ( // Only show empty state for logged-in user in "user" view
                      <div className="empty-state">
                        <p>No team members assigned to tasks yet.</p>
                      </div>
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
          ) : (
            <div className="empty-board-guide">
              {user ? (
                <><div className="empty-guide-icon">📂</div><h3 className="empty-guide-title">Select a Project to Begin</h3><p className="empty-guide-subtitle">Choose a project from the sidebar.</p></>
              ) : (
                <><div className="empty-guide-icon">🚀</div><h3 className="empty-guide-title">No tasks yet!</h3><p className="empty-guide-subtitle">Go to the <Link to="/" className="font-semibold text-indigo-400 hover:text-indigo-500">Home page</Link> to generate tasks.</p></>
              )}
            </div>
          )}
        </div>
      </div>

      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleSaveTask} onDelete={handleDeleteTask} teamMembers={user ? [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))] : []} />}
      {showAddTaskModal && user && <AddTaskModal onClose={() => setShowAddTaskModal(false)} onSave={handleAddTask} teamMembers={[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))]} />}
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteProject}
        projectName={currentProjectTitle}
      />
      <Notification
        isOpen={showDeleteNotification}
        onClose={() => setShowDeleteNotification(false)}
        message="Project successfully deleted."
      />
    </div>
  );
}