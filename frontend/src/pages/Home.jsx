import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiZap } from "react-icons/fi";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:5000";

export default function Home({ addTasks, user }) {
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);
  const [showProjects, setShowProjects] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const hasLoaded = useRef(false);
  const navigate = useNavigate();

  // Set default due date on component load for all users
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setDueDate(defaultDate.toISOString().split("T")[0]);
  }, []);

  // Load saved projects and groups from Firebase
  useEffect(() => {
    if (!user) {
      // Clear everything when user logs out
      setSavedProjects([]);
      setGroups([]);
      setProjectTitle("");
      setDescription("");
      setSelectedGroupId("");
      setShowProjects(false);
      hasLoaded.current = false;
      return;
    }
    
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    
    loadProjectsFromFirebase();
    loadGroups();
    
  }, [user]);

  const loadProjectsFromFirebase = async () => {
    if (loadingProjects) return;
    if (!user) {
      setSavedProjects([]);
      setLoadingProjects(false);
      return;
    }
    
    // Check cache first
    const cacheKey = `projects_${user.uid}`;
    const cacheTimeKey = `projects_${user.uid}_time`;
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const now = Date.now();
    
    if (cachedTime && (now - parseInt(cachedTime)) < 30000) {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setSavedProjects(JSON.parse(cachedData));
        return; // Use cached data, no need to fetch
      }
    }
    
    setLoadingProjects(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/projects?userId=${user.uid}&limit=50`);
      const projects = response.data.projects || [];
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(projects));
      localStorage.setItem(cacheTimeKey, now.toString());
      
      setSavedProjects(projects);
    } catch (err) {
      console.error("Error loading projects from Firebase:", err);
      setSavedProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadGroups = async () => {
    if (!user) return;
    
    // Check cache first
    const cacheKey = `groups_${user.uid}`;
    const cacheTimeKey = `groups_${user.uid}_time`;
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const now = Date.now();
    
    if (cachedTime && (now - parseInt(cachedTime)) < 30000) {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setGroups(JSON.parse(cachedData));
        return; // Use cached data
      }
    }
    
    try {
      const response = await axios.get(`${BACKEND_URL}/api/groups/user/${user.uid}?limit=20`);
      const loadedGroups = response.data.groups || [];
      
      // Names are now included from backend, no need for individual fetches
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(loadedGroups));
      localStorage.setItem(cacheTimeKey, now.toString());
      
      setGroups(loadedGroups);
    } catch (err) {
      console.error("Error loading groups:", err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    console.log("--- GUEST MODE DEBUG: Starting handleGenerate ---");

    if (!projectTitle.trim()) {
      setError("Please enter a project title");
      console.log("--- GUEST MODE DEBUG: Exited - No project title ---");
      return;
    }

    // Get team members from selected group (INCLUDING admin)
    let teamMembers = [];
    if (selectedGroupId) {
      const selectedGroup = groups.find(g => g.id === selectedGroupId);
      console.log("📋 Selected group data:", selectedGroup);
      
      if (selectedGroup && selectedGroup.members) {
        teamMembers = selectedGroup.members.map(member => ({
          name: member.name || "Unassigned",
          role: member.role
        }));
        
        // CRITICAL: Include admin as a team member for task assignment
        // Default to "Software Engineer" if admin hasn't selected a role yet
        if (selectedGroup.adminId === user.uid) {
          const adminRole = selectedGroup.adminRole || "Software Engineer";
          const adminName = selectedGroup.adminName || user.username || user.email;
          
          teamMembers.push({
            name: adminName,
            role: adminRole
          });
          console.log(`✅ Added admin to team: ${adminName} (${adminRole})`);
        }
      }
      console.log("📤 Sending team members to backend:", teamMembers);
    }
    
    setError("");
    setLoading(true);
    console.log("--- GUEST MODE DEBUG: Loading state set to true. Calling backend... ---");

    try {
      // Send clean description, team members, and current user info
      const response = await axios.post(`${BACKEND_URL}/generate`, {
        description: description,
        teamMembers: teamMembers,
        currentUser: user ? {
          uid: user.uid,
          username: user.username || user.email,
          email: user.email
        } : null
      });

      console.log("--- GUEST MODE DEBUG: Backend response received ---", response.data);

      const generatedTasks = response.data.tasks || [];
      
      // FAILSAFE: Detect and reject Alice/Bob/Carol
      const forbiddenNames = ["Alice", "Bob", "Carol", "Unknown", "Unassigned"];
      const validTeamMembers = teamMembers.map(m => m.name).filter(n => n && n !== "Unassigned");
      
      console.log("🛡️ Valid team members for failsafe:", validTeamMembers);

      const formattedTasks = generatedTasks.map((task, idx) => {
        let assignedUser = task.assigned_user || "Unassigned";
        
        // FAILSAFE: Replace forbidden names with actual team members
        if (forbiddenNames.includes(assignedUser)) {
          console.warn(`⚠️ FAILSAFE: Detected forbidden name "${assignedUser}", replacing...`);
          if (validTeamMembers.length > 0) {
            assignedUser = validTeamMembers[idx % validTeamMembers.length];
            console.log(`✅ Reassigned to: ${assignedUser}`);
          }
        }
        
        console.log(`Task ${idx + 1}: ${task.title} -> Assigned to: ${assignedUser}`);
        return {
          id: Date.now() + idx,
          sequence: task.sequence || (idx + 1),  // 🔥 FIX: Preserve sequence from backend
          title: task.title,
          description: task.description || "Task details",
          status: "todo",
          priority: task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) || "Medium",
          assignedTo: assignedUser,
          task_type: task.task_type || "Backend",
          acceptance_criteria: task.acceptance_criteria || [],
          dependencies: task.dependencies || [],
          due: dueDate,
        };
      });

      const project = {
        userId: user?.uid,
        groupId: selectedGroupId || null,
        title: projectTitle,
        description: description,
        tasks: formattedTasks,
      };

      // Only save to Firebase if user is logged in
      if (user) {
        console.log("--- GUEST MODE DEBUG: User is logged in. Saving project... ---");
        try {
          const saveResponse = await axios.post(`${BACKEND_URL}/api/projects`, project);
          console.log("✅ Project saved to Firebase:", saveResponse.data);
          
          const projectId = saveResponse.data.projectId;
          
          // Invalidate cache to ensure fresh data
          localStorage.removeItem(`projects_${user.uid}`);
          localStorage.removeItem(`projects_${user.uid}_time`);
          
          // Don't save to localStorage - use Firebase as single source of truth
          localStorage.setItem("currentProjectId", projectId);
          localStorage.setItem("currentProjectTitle", projectTitle);
        } catch (saveErr) {
          console.error("⚠️ Failed to save to Firebase:", saveErr);
          alert("Failed to save project. Your tasks will be temporary.");
        }
      } else {
        // Guest mode - tasks only in memory (not saved)
        console.log("--- GUEST MODE DEBUG: Guest user. Storing project title in localStorage. ---");
        localStorage.setItem("currentProjectTitle", projectTitle);
      }

      console.log("--- GUEST MODE DEBUG: Calling addTasks and navigating to dashboard... ---");
      addTasks(formattedTasks);

      navigate("/dashboard");
    } catch (err) {
      console.error("--- GUEST MODE DEBUG: An error occurred in handleGenerate ---", err);
      setError(err.response?.data?.error || "Failed to generate tasks. Ensure the backend is running and accessible.");
    } finally {
      console.log("--- GUEST MODE DEBUG: Finished handleGenerate. Setting loading to false. ---");
      setLoading(false);
    }
  };

  const loadProject = (project) => {
    setProjectTitle(project.title);
    setDescription(project.description);
    addTasks(project.tasks);
    setShowProjects(false);
    
    localStorage.setItem("currentProjectId", project.id);
    localStorage.setItem("currentProjectTitle", project.title);
    
    navigate("/dashboard");
  };

  const deleteProject = async (projectId) => {
    if (window.confirm("Delete this project?")) {
      try {
        await axios.delete(`${BACKEND_URL}/api/projects/${projectId}`);
        console.log("✅ Project deleted from Firebase");
        
        // Invalidate cache
        if (user) {
          localStorage.removeItem(`projects_${user.uid}`);
          localStorage.removeItem(`projects_${user.uid}_time`);
        }
      } catch (err) {
        console.error("⚠️ Failed to delete from Firebase:", err);
      }
      
      const projects = savedProjects.filter(p => p.id !== projectId);
      localStorage.setItem("projects", JSON.stringify(projects));
      setSavedProjects(projects);
      
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
    <div className="page home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Smart Scheduling &amp; Productivity Assistant</h1>
          <p className="tagline">Organize your tasks, stay productive, and work smarter.</p>
        </div>
      </section>

      {/* Generate Tasks Section */}
      <section style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
        <h2 style={{ marginBottom: "20px", textAlign: "center", color: "var(--text-primary)" }}>✨ Generate Tasks with AI</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "30px" }}>
          Describe your project, and our AI will automatically break it down into tasks and assign them to team members.
        </p>

        {/* Guest Mode Notice */}
        {!user && (
          <div style={{
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "1px solid #fbbf24",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, color: "#92400e", fontSize: "0.9rem" }}>
              ℹ️ <strong>Guest Mode:</strong> You can generate tasks, but they won't be saved. <Link to="/login" style={{ color: "#667eea", textDecoration: "underline" }}>Login</Link> to save your projects!
            </p>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "20px" }}>
            ❌ {error}
          </div>
        )}

        {/* View Saved Projects Button - Moved to top */}
        {user && (
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <button
              onClick={() => {
                setShowProjects(!showProjects);
                if (!showProjects) loadProjectsFromFirebase();
              }}
              className="btn-show-projects"
            >
              📁 {showProjects ? "Hide" : "View"} Saved Projects ({savedProjects.length})
            </button>
          </div>
        )}

        {/* Saved Projects List */}
        {showProjects && (
          <div style={{ marginBottom: "30px" }}>
            {savedProjects.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px", background: "var(--card)", borderRadius: "8px", border: "1px solid var(--border)" }}>No saved projects yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "15px" }}>
                {savedProjects.map((project) => (
                  <div
                    key={project.id}
                    style={{
                      background: "var(--card)",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>
                        {project.title}
                        {project.groupId ? (
                          <span style={{ 
                            marginLeft: "10px", 
                            padding: "4px 8px", 
                            background: "rgba(102, 126, 234, 0.15)", 
                            color: "var(--accent)", 
                            borderRadius: "6px", 
                            fontSize: "0.75rem", 
                            fontWeight: "600",
                            border: "1px solid rgba(102, 126, 234, 0.3)"
                          }}>
                            👥 Group
                          </span>
                        ) : (
                          <span style={{ 
                            marginLeft: "10px", 
                            padding: "4px 8px", 
                            background: "rgba(100, 116, 139, 0.15)", 
                            color: "var(--text-muted)", 
                            borderRadius: "6px", 
                            fontSize: "0.75rem", 
                            fontWeight: "600",
                            border: "1px solid rgba(100, 116, 139, 0.3)"
                          }}>
                            👤 Individual
                          </span>
                        )}
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                        {project.tasks?.length || 0} tasks • {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => loadProject(project)}
                        className="btn btn-small"
                        style={{ background: "#667eea", color: "white" }}
                      >
                        Load
                      </button>
                      {/* Only show delete button if user created the project (is admin) */}
                      {project.userId === user?.uid && (
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="btn btn-small"
                          style={{ background: "#ef4444", color: "white" }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleGenerate} className="generate-form">
          <div className="form-group">
            <label htmlFor="projectTitle">Project Title *</label>
            <input
              id="projectTitle"
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="E.g., E-Commerce Mobile App"
              required
              disabled={loading}
            />
          </div>

          {/* Group Selector */}
          {user && groups.length > 0 && (
            <div className="form-group">
              <label htmlFor="groupSelect">Select Group (Optional)</label>
              <select
                id="groupSelect"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={loading}
              >
                <option value="">No Group (Manual Assignment)</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.members?.length || 0} members)
                  </option>
                ))}
              </select>
              <small className="form-hint">
                AI will automatically assign tasks to group members based on their roles
              </small>
            </div>
          )}

          {/* Link to create group if none exists */}
          {user && groups.length === 0 && (
            <div className="info-box" style={{ marginBottom: "20px" }}>
              <p style={{ margin: 0 }}>
                💡 <strong>Want AI to assign tasks to your team?</strong>
                <br />
                <Link to="/groups" style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: 600 }}>
                  Create a group
                </Link> and add team members with their roles!
              </p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="description">Project Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project in detail. Include features, technologies, requirements, etc."
              rows="6"
              disabled={loading}
            ></textarea>
            <small className="form-hint" style={{ marginTop: '8px', display: 'block' }}>
              Note: The AI's output is based on your prompt. Results may need refinement.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Default Due Date</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
              className="date-input"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading}
            style={{
              background: loading ? "#cbd5e1" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "14px 28px",
              borderRadius: "10px",
              border: "none",
              fontWeight: "700",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: loading ? "none" : "0 4px 15px rgba(102, 126, 234, 0.4)",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <FiZap className="mr-2" />
                Generate Tasks
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
