import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile({ user }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Load user stats from localStorage
    try {
      const savedTasks = localStorage.getItem("tasks");
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const userTasks = tasks.filter(t => t.assignedTo === (user.username || user.email));
        
        setStats({
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter(t => t.status === "done").length,
          inProgressTasks: userTasks.filter(t => t.status === "in-progress").length,
          todoTasks: userTasks.filter(t => t.status === "todo").length
        });
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const copyUserId = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page profile-page">
      <div className="page-header">
        <h1>👤 My Profile</h1>
        <p className="subtitle">View and manage your account information</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-avatar-large">
            {user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
          </div>

          <h2>{user.username || "User"}</h2>
          <p className="profile-email">{user.email}</p>

          <div className="profile-details">
            <div className="detail-section">
              <h3>📋 User ID</h3>
              <div className="user-id-box">
                <code className="user-id">{user.uid}</code>
                <button 
                  className="btn-copy"
                  onClick={copyUserId}
                  title="Copy User ID"
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
              <p className="detail-hint">
                Share this ID with your team admin to be added to groups
              </p>
            </div>

            <div className="detail-section">
              <h3>📧 Email</h3>
              <p className="detail-value">{user.email}</p>
            </div>

            <div className="detail-section">
              <h3>🔐 Account Type</h3>
              <p className="detail-value">Standard User</p>
            </div>

            <div className="detail-section">
              <h3>📅 Member Since</h3>
              <p className="detail-value">
                {new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="profile-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate("/groups")}
            >
              👥 Manage Groups
            </button>
            <button 
              className="btn btn-ghost"
              onClick={() => navigate("/dashboard")}
            >
              📊 Go to Dashboard
            </button>
          </div>
        </div>

        {/* Task Statistics */}
        <div className="stats-section">
          <h3>📊 Your Task Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h4>{stats.totalTasks}</h4>
                <p>Total Tasks</p>
              </div>
            </div>

            <div className="stat-card stat-done">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h4>{stats.completedTasks}</h4>
                <p>Completed</p>
              </div>
            </div>

            <div className="stat-card stat-progress">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <h4>{stats.inProgressTasks}</h4>
                <p>In Progress</p>
              </div>
            </div>

            <div className="stat-card stat-todo">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <h4>{stats.todoTasks}</h4>
                <p>To Do</p>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          {stats.totalTasks > 0 && (
            <div className="completion-section">
              <h4>Completion Rate</h4>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }}
                >
                  <span className="progress-text">
                    {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
                  </span>
                </div>
              </div>
              <p className="progress-hint">
                You've completed {stats.completedTasks} out of {stats.totalTasks} tasks
              </p>
            </div>
          )}
        </div>

        <div className="profile-card">
          <h4>💡 How to join a team</h4>
          <ol>
            <li>Copy your User ID using the button above</li>
            <li>Send your User ID to your team administrator</li>
            <li>The admin will add you to their group with a specific role</li>
            <li>You'll be able to collaborate on projects together!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
