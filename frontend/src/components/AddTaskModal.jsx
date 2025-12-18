import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:5000";

export default function AddTaskModal({ onClose, onSave, teamMembers, existingTasks = [] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("todo");
  const [taskType, setTaskType] = useState("Feature");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [insertAfterTaskId, setInsertAfterTaskId] = useState("end");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimateCache, setEstimateCache] = useState({});

  // Auto-estimate duration when title, priority, or assignee changes
  useEffect(() => {
    const estimateDuration = async () => {
      if (!title.trim() || title.length < 3) {
        setEstimatedHours(null);
        return;
      }

      // Create cache key from inputs
      const cacheKey = `${title.trim()}|${priority}|${assignedTo || "Unassigned"}`;
      
      // Check if we already have this estimate cached
      if (estimateCache[cacheKey]) {
        setEstimatedHours(estimateCache[cacheKey]);
        return;
      }

      setIsEstimating(true);
      try {
        const response = await axios.post(`${BACKEND_URL}/api/estimate-duration`, {
          title: title.trim(),
          priority: priority,
          assignee: assignedTo || "Unassigned"
        });
        
        const hours = response.data.estimatedHours;
        setEstimatedHours(hours);
        
        // Cache the result
        setEstimateCache(prev => ({
          ...prev,
          [cacheKey]: hours
        }));
      } catch (error) {
        console.error("Duration estimation error:", error);
        setEstimatedHours(2.0); // Default fallback
      } finally {
        setIsEstimating(false);
      }
    };

    const debounceTimer = setTimeout(estimateDuration, 800);
    return () => clearTimeout(debounceTimer);
  }, [title, priority, assignedTo, estimateCache]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    if (!title.trim()) {
      alert("Task title is required");
      return;
    }

    setIsSubmitting(true);

    const newTask = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      task_type: taskType,
      assignedTo: assignedTo || "Unassigned",
      due: dueDate,
      acceptance_criteria: [],
      dependencies: [],
      estimatedHours: estimatedHours || 2.0,
      insertAfterTaskId: insertAfterTaskId !== "end" ? insertAfterTaskId : null
    };

    onSave(newTask);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="modal-content modern-modal" onClick={(e) => e.stopPropagation()} style={{ 
        maxWidth: '600px',
        width: '100%',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div className="modal-header" style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px 12px 0 0',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              ➕
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Add New Task</h3>
          </div>
          <button className="modal-close" onClick={onClose} style={{ 
            color: 'white', 
            opacity: 0.9,
            fontSize: '24px',
            background: 'rgba(255,255,255,0.2)',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: '0 24px 24px' }}>
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="add-title" style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>Task Title *</label>
              <input
                id="add-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="add-description" style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>Description</label>
              <textarea
                id="add-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description"
                rows="3"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="add-insert-position" style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>Insert Position</label>
              <select
                id="add-insert-position"
                value={insertAfterTaskId}
                onChange={(e) => setInsertAfterTaskId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  borderRadius: '8px',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              >
                <option value="end">➕ Add to end (default)</option>
                {existingTasks
                  .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                  .map((task, index) => (
                    <option key={task.id} value={task.id}>
                      After #{index + 1}: {task.title.substring(0, 40)}{task.title.length > 40 ? '...' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: '20px' }}>
              <div className="form-group">
                <label htmlFor="add-task-type" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>Task Type</label>
                <select
                  id="add-task-type"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Enhancement">Enhancement</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Backend">Backend</option>
                  <option value="Frontend">Frontend</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Testing">Testing</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="add-priority" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>Priority</label>
                <select
                  id="add-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="add-status" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>Status</label>
                <select
                  id="add-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: '20px' }}>
              <div className="form-group">
                <label htmlFor="add-assigned" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>Assigned To</label>
                {teamMembers && teamMembers.length > 0 ? (
                  <select
                    id="add-assigned"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border)',
                      borderRadius: '8px',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
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
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border)',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-due" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>Due Date</label>
                <input
                  id="add-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    colorScheme: 'dark'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
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

            <div className="modal-actions" style={{ 
              marginTop: '24px', 
              paddingTop: '20px', 
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button 
                type="button" 
                onClick={onClose}
                style={{
                  padding: '12px 28px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '2px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  e.currentTarget.style.borderColor = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '12px 28px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '10px',
                  background: isSubmitting ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
                }}
              >
                <span>{isSubmitting ? '⏳' : '✅'}</span>
                <span>{isSubmitting ? 'Adding...' : 'Add Task'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
