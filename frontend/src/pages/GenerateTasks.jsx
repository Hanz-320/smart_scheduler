import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:5000";

export default function GenerateTasks({ addTasks, user }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);
  const [showProjects, setShowProjects] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadProjectsFromFirebase();
    }
  }, [user]);

  const loadProjectsFromFirebase = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/projects?userId=${user.uid}`);
      setSavedProjects(response.data.projects || []);
    } catch (err) {
      console.error("Error loading projects from Firebase:", err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please enter a description for your project.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/generate`, { description });
      const generatedTasks = response.data.tasks.map((task, index) => ({
        ...task,
        id: `gen-${Date.now()}-${index}`,
      }));
      addTasks(generatedTasks);
      navigate("/dashboard");
    } catch (err) {
      setError("Failed to generate tasks. Please try again later.");
      console.error("Error generating tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProject = (project) => {
    setDescription(project.description);
    addTasks(project.tasks);
    navigate("/dashboard");
  };

  return (
    <div className="page generate-tasks-page">
      <section>
        <h2>Generate Tasks with AI</h2>
        <p>
          Describe your project, and our AI will automatically break it down into
          actionable tasks.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleGenerate} className="generate-form">
          <div className="form-group">
            <label htmlFor="description">Project Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Build a recipe app with React and Firebase..."
              rows="5"
            ></textarea>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Generating..." : "Generate Tasks"}
          </button>
        </form>
      </section>
      <section>
        <h2>Or, Load a Saved Project</h2>
        <button onClick={() => setShowProjects(!showProjects)} className="btn">
          {showProjects ? "Hide" : "Show"} Saved Projects
        </button>
        {showProjects && (
          <div className="saved-projects-list">
            {savedProjects.length > 0 ? (
              savedProjects.map((project) => (
                <div key={project.id} className="saved-project-item">
                  <h3>{project.title}</h3>
                  <button onClick={() => loadProject(project)} className="btn btn-secondary">
                    Load
                  </button>
                </div>
              ))
            ) : (
              <p>No saved projects found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}