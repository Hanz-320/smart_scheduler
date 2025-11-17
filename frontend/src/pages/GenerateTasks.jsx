import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = "http://localhost:5000";

export default function GenerateTasks({ addTasks }) {
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);
  const [showProjects, setShowProjects] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const hasLoaded = useRef(false);
  const navigate = useNavigate();

  // Load saved projects from Firebase
  useEffect(() => {
    if (hasLoaded.current) return; // Only load once
    hasLoaded.current = true;
    
    loadProjectsFromFirebase();
    
    // Set default due date to 7 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setDueDate(defaultDate.toISOString().split("T")[0]);
  }, []);

  const loadProjectsFromFirebase = async () => {
    if (loadingProjects) return; // Prevent duplicate calls
    
    setLoadingProjects(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/projects`);
      setSavedProjects(response.data.projects || []);
    } catch (err) {
      console.error("Error loading projects from Firebase:", err);
      // Fallback to localStorage if Firebase fails
      const projects = JSON.parse(localStorage.getItem("projects") || "[]");
      setSavedProjects(projects);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!projectTitle.trim()) {
      setError("Please enter a project title");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      // Call backend /generate endpoint
      const response = await axios.post("http://localhost:5000/generate", {
        description,
      });

      const generatedTasks = response.data.tasks || [];

      // Map backend response to frontend task format (with full details)
      const formattedTasks = generatedTasks.map((task, idx) => ({
        id: Date.now() + idx,
        title: task.title,
        description: task.description || "Task details",
        status: "todo",
        priority: task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) || "Medium",
        assignedTo: task.assigned_user || "Unassigned",
        task_type: task.task_type || "Backend",
        acceptance_criteria: task.acceptance_criteria || [],
        dependencies: task.dependencies || [],
        due: dueDate, // Use user-selected date
      }));

      // Save project to Firebase
      const project = {
        title: projectTitle,
        description: description,
        tasks: formattedTasks,
      };

      try {
        const saveResponse = await axios.post(`${BACKEND_URL}/api/projects`, project);
        console.log("✅ Project saved to Firebase:", saveResponse.data);
        
        const projectId = saveResponse.data.projectId;
        
        // Also save to localStorage as backup
        const localProjects = JSON.parse(localStorage.getItem("projects") || "[]");
        localProjects.unshift({
          id: projectId,
          ...project,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("projects", JSON.stringify(localProjects));
        
        // Save current project info for dashboard
        localStorage.setItem("currentProjectId", projectId);
        localStorage.setItem("currentProjectTitle", projectTitle);
      } catch (saveErr) {
        console.error("⚠️ Failed to save to Firebase, using localStorage only:", saveErr);
        // Fallback to localStorage
        const localProjects = JSON.parse(localStorage.getItem("projects") || "[]");
        const projectId = Date.now().toString();
        localProjects.unshift({
          id: projectId,
          ...project,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("projects", JSON.stringify(localProjects));
        
        // Save current project info for dashboard
        localStorage.setItem("currentProjectId", projectId);
        localStorage.setItem("currentProjectTitle", projectTitle);
      }

      // Add generated tasks to state
      addTasks(formattedTasks);

      // Clear cache to force immediate refresh on dashboard
      if (user) {
        const cacheTimeKey = `projects_${user.uid}_time`;
        localStorage.removeItem(cacheTimeKey);
      }

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Error generating tasks:", err);
      setError(err.response?.data?.error || "Failed to generate tasks. Ensure backend is running on http://localhost:5000");
    } finally {
      setLoading(false);
    }
  };

  const loadProject = (project) => {
    setProjectTitle(project.title);
    setDescription(project.description);
    addTasks(project.tasks);
    setShowProjects(false);
    
    // Save current project info for dashboard display
    localStorage.setItem("currentProjectId", project.id);
    localStorage.setItem("currentProjectTitle", project.title);
    
    navigate("/dashboard");
  };

  const deleteProject = async (projectId) => {
    if (window.confirm("Delete this project?")) {
      try {
        // Delete from Firebase
        await axios.delete(`${BACKEND_URL}/api/projects/${projectId}`);
        console.log("✅ Project deleted from Firebase");
      } catch (err) {
        console.error("⚠️ Failed to delete from Firebase:", err);
      }
      
      // Delete from local state and localStorage
      const projects = savedProjects.filter(p => p.id !== projectId);
      localStorage.setItem("projects", JSON.stringify(projects));
      setSavedProjects(projects);
      
      // If this was the currently selected project in Dashboard, clear it
      const currentProjectId = localStorage.getItem("currentProjectId");
      if (currentProjectId === projectId) {
        console.log("⚠️ Deleted project was selected, clearing Dashboard state...");
        localStorage.removeItem("currentProjectId");
        localStorage.removeItem("currentProjectTitle");
        localStorage.removeItem("tasks");
      }
    }
  };

  return (
    <div className="page generate-page">
      <h2>Generate Tasks from Project Description</h2>
      <p className="subtitle">
        Describe your project, and our AI will automatically break it down into tasks and assign them to team members.
      </p>

      {/* Saved Projects Button */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <button
          type="button"
          className="btn"
          onClick={() => setShowProjects(!showProjects)}
          style={{ background: "#6366f1", color: "white", padding: "10px 20px" }}
        >
          📁 {showProjects ? "Hide" : "Show"} Saved Projects ({savedProjects.length})
        </button>
      </div>

      {/* Saved Projects List */}
      {showProjects && savedProjects.length > 0 && (
        <div className="saved-projects" style={{ marginBottom: "30px" }}>
          <h3 style={{ fontSize: "1.2rem", marginBottom: "15px" }}>Your Saved Projects</h3>
          <div style={{ display: "grid", gap: "15px" }}>
            {savedProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <div onClick={() => loadProject(project)} style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem", fontWeight: "600" }}>
                    {project.title}
                  </h4>
                  <p style={{ margin: "0", fontSize: "0.85rem", color: "#6b7280" }}>
                    {project.description.substring(0, 100)}...
                  </p>
                  <p style={{ margin: "8px 0 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                    {project.tasks.length} tasks • {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form className="generate-form" onSubmit={handleGenerate}>
        <label htmlFor="title">Project Title</label>
        <input
          id="title"
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="E.g., E-commerce Website, Mobile App, Analytics Dashboard"
          required
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "0.95rem",
            marginBottom: "20px",
          }}
        />

        <label htmlFor="dueDate">Task Due Date</label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "0.95rem",
            marginBottom: "20px",
          }}
        />

        <label htmlFor="desc">Project Description</label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="E.g., Build a mobile app for task management with user authentication, database sync, and push notifications."
          rows="6"
          required
        />

        {error && <div className="error-msg">{error}</div>}

        <div className="form-actions">
          <button
            type="submit"
            className="btn primary"
            disabled={loading}
          >
            {loading ? "🔄 Generating..." : "🚀 Generate Tasks"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="info-box">
        <h4>How it works:</h4>
        <ul>
          <li><strong>Gemini LLM:</strong> Breaks down your project into detailed subtasks.</li>
          <li><strong>ML Model:</strong> Analyzes task complexity and assigns to optimal team members.</li>
          <li><strong>Auto-assign:</strong> Tasks appear in your dashboard ready to manage.</li>
        </ul>
        <p className="muted">💡 Backend must be running on http://localhost:5000 for this feature to work.</p>
      </div>
    </div>
  );
}
