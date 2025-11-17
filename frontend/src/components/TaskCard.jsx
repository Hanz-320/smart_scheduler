import React, { useState } from "react";

export default function TaskCard({ task, index, user, onEdit, viewMode, taskNumber }) {
  const [expanded, setExpanded] = useState(false);
  
  const priorityClass = {
    High: "priority-high",
    Medium: "priority-medium",
    Low: "priority-low",
  }[task.priority] || "priority-low";

  // Check if this task is assigned to the current user
  const isMyTask = user && (task.assignedTo === user.username || task.assignedTo === user.email);

  return (
    <div 
      className={`task-card ${priorityClass} ${isMyTask ? 'my-task' : ''}`}
      onClick={() => onEdit(task)}
      style={{ cursor: 'pointer' }}
    > 
      {/* Show task number only in "By Status" view */}
      {viewMode === "status" && (
        <div className="task-number-badge">#{taskNumber}</div>
      )}
      
      <div className="task-card-header">
        <span className="priority">{task.priority}</span>
        {task.task_type && <span className="task-type">{task.task_type}</span>}
      </div>
      
      <h4 className="task-title">{task.title}</h4>
      
      {task.description && <p className="task-desc">{task.description}</p>}
      
      <div className="task-meta">
        <small>👤 <strong>{task.assignedTo || "—"}</strong> {isMyTask && <span className="you-badge">You</span>}</small>
        {task.due && <small>📅 <strong>{task.due}</strong></small>}
      </div>

      {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
        <details className="task-details">
          <summary onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
            ✓ Details ({task.acceptance_criteria.length})
          </summary>
          {expanded && (
            <div className="task-expanded">
              {task.acceptance_criteria.length > 0 && (
                <div className="criteria-list">
                  <strong>Acceptance Criteria:</strong>
                  <ul>
                    {task.acceptance_criteria.map((criterion, i) => (
                      <li key={i}>{criterion}</li>
                    ))}
                  </ul>
                </div>
              )}
              {task.dependencies && task.dependencies.length > 0 && (
                <div className="dependencies-list">
                  <strong>Dependencies:</strong>
                  <ul>
                    {task.dependencies.map((dep, i) => (
                      <li key={i}>{dep}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </details>
      )}
    </div>
  );
}
