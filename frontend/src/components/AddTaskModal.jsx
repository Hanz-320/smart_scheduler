import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = "http://localhost:5000";

export default function AddTaskModal({ onClose, onSave, teamMembers }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("todo");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Auto-estimate duration when title, priority, or assignee changes
  useEffect(() => {
    const estimateDuration = async () => {
      if (!title.trim() || title.length < 3) {
        setEstimatedHours(null);
        return;
      }

      setIsEstimating(true);
      try {
        const response = await axios.post(`${BACKEND_URL}/api/estimate-duration`, {
          title: title.trim(),
          priority: priority,
          assignee: assignedTo || "Unassigned"
        });
        
        setEstimatedHours(response.data.estimatedHours);
      } catch (error) {
        console.error("Duration estimation error:", error);
        setEstimatedHours(2.0); // Default fallback
      } finally {
        setIsEstimating(false);
      }
    };

    const debounceTimer = setTimeout(estimateDuration, 500);
    return () => clearTimeout(debounceTimer);
  }, [title, priority, assignedTo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert("Task title is required");
      return;
    }

    const newTask = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assignedTo: assignedTo || "Unassigned",
      due: dueDate,
      task_type: "Feature",
      acceptance_criteria: [],
      dependencies: [],
      estimatedHours: estimatedHours || 2.0
    };

    onSave(newTask);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Add New Task</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="add-title">Task Title *</label>
              <input
                id="add-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="add-description">Description</label>
              <textarea
                id="add-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description"
                rows="3"
              />
            </div>

            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label htmlFor="add-priority">Priority</label>
                <select
                  id="add-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="add-status">Status</label>
                <select
                  id="add-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label htmlFor="add-assigned">Assigned To</label>
                {teamMembers && teamMembers.length > 0 ? (
                  <select
                    id="add-assigned"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member, idx) => (
                      <option key={idx} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="add-assigned"
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Assign to..."
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-due">Due Date</label>
                <input
                  id="add-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* AI Estimated Duration */}
            {estimatedHours !== null && (
              <div className="form-group" style={{ 
                background: 'var(--bg-secondary)', 
                padding: '12px', 
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤖 AI Estimated Duration</span>
                  {isEstimating && <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Calculating...</span>}
                </label>
                <div style={{ 
                  fontSize: '1.5em', 
                  fontWeight: 'bold', 
                  color: 'var(--accent)',
                  marginTop: '4px'
                }}>
                  {estimatedHours}h
                </div>
                <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Based on task complexity and assignee
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                ✅ Add Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
