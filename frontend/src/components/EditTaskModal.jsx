import React, { useState, useEffect } from "react";

export default function EditTaskModal({ task, onClose, onSave, onDelete, teamMembers }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [dueDate, setDueDate] = useState(task.due || "");
  const [status, setStatus] = useState(task.status);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...task,
      title,
      description,
      priority,
      assignedTo,
      due: dueDate,
      status
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Task</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="edit-title">Task Title *</label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-priority">Priority</label>
              <select
                id="edit-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-status">Status</label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-assigned">Assigned To</label>
              {teamMembers && teamMembers.length > 0 ? (
                <select
                  id="edit-assigned"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member, idx) => (
                    <option key={idx} value={member}>{member}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="edit-assigned"
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Assignee name"
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-due">Due Date</label>
              <input
                id="edit-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-danger"
              onClick={handleDelete}
              style={{ marginRight: 'auto' }}
            >
              🗑️ Delete
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              💾 Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
