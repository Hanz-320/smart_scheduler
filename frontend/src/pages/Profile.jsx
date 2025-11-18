import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiClipboard, FiCheck, FiGrid, FiCheckSquare, FiEdit, FiList } from "react-icons/fi";
import EditProfileModal from "../components/EditProfileModal";

export default function Profile({ user }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveProfile = async (updates) => {
    console.log("Updating profile:", updates);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        alert("Profile updated successfully!");
        resolve();
      }, 1000);
    });
  };

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <>
      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
        />
      )}
      
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        padding: '40px 20px'
      }}>
        <div style={{ 
          maxWidth: '1100px', 
          margin: '0 auto'
        }}>
          
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '40px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>My Profile</h1>
              <p style={{ 
                color: 'var(--text-secondary)',
                fontSize: '15px'
              }}>Manage your account and view your activity</p>
            </div>
            <button 
              onClick={() => navigate("/dashboard")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
              }}
            >
              <FiGrid size={18} />
              <span>Dashboard</span>
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth >= 768 ? '1fr 2fr' : '1fr',
            gap: '30px'
          }}>
            
            {/* Left Column: Profile Card */}
            <div>
              <div style={{ 
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}>
                {/* Avatar and Basic Info */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center',
                  marginBottom: '32px'
                }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    fontWeight: '700',
                    marginBottom: '20px',
                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)'
                  }}>
                    {user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <h2 style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: 'var(--text-primary)',
                    marginBottom: '6px'
                  }}>{user.username || "User"}</h2>
                  <p style={{ 
                    fontSize: '14px', 
                    color: 'var(--text-secondary)'
                  }}>{user.email}</p>
                </div>

                {/* Account Details */}
                <div style={{ 
                  paddingTop: '24px',
                  marginBottom: '24px',
                  borderTop: '1px solid var(--border)'
                }}>
                  <h3 style={{ 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '20px'
                  }}>Account Details</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <FiUser size={18} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Username</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{user.username || "Not set"}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <FiMail size={18} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Email</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{user.email}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <FiClipboard size={18} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>User ID</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <code style={{ 
                            fontSize: '11px',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{user.uid}</code>
                          <button 
                            onClick={copyUserId}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: copied ? 'var(--success)' : 'var(--bg-tertiary)',
                              color: copied ? 'white' : 'var(--text-primary)',
                              border: copied ? 'none' : '1px solid var(--border)',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {copied ? "✓" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  paddingTop: '24px',
                  borderTop: '1px solid var(--border)'
                }}>
                  <button 
                    onClick={() => navigate('/groups')}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
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
                    <span>👥</span>
                    <span>Manage Groups</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowEditModal(true)}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      backgroundColor: 'transparent',
                      color: 'var(--primary)',
                      border: '2px solid var(--primary)',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--primary)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>✏️</span>
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Stats and Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Stats Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth >= 640 ? 'repeat(2, 1fr)' : '1fr',
                gap: '16px'
              }}>
                <StatCard icon={<FiGrid />} title="Total Tasks" value={stats.totalTasks} color="primary" />
                <StatCard icon={<FiCheckSquare />} title="Completed" value={stats.completedTasks} color="success" />
                <StatCard icon={<FiEdit />} title="In Progress" value={stats.inProgressTasks} color="warning" />
                <StatCard icon={<FiList />} title="To Do" value={stats.todoTasks} color="info" />
              </div>

              {/* Productivity Overview */}
              <div style={{ 
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)',
                  marginBottom: '6px'
                }}>Productivity Overview</h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)',
                  marginBottom: '24px'
                }}>Your task completion rate</p>
                
                <div style={{ 
                  width: '100%',
                  height: '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  <div 
                    style={{ 
                      height: '100%',
                      width: `${completionRate}%`,
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                      borderRadius: '20px',
                      transition: 'width 0.5s ease'
                    }}
                  ></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '700', color: 'var(--success)' }}>{stats.completedTasks}</span>
                    {' of '}
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{stats.totalTasks}</span>
                    {' tasks completed'}
                  </p>
                  <span style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: 'var(--text-primary)'
                  }}>{completionRate}%</span>
                </div>
              </div>

              {/* Need Help Section */}
              <div style={{ 
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '28px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}>Need Help?</h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                  lineHeight: '1.6'
                }}>
                  If you have any questions or need assistance, feel free to reach out to our support team.
                </p>
                <button 
                  onClick={() => window.open('mailto:support@smartscheduler.com', '_blank')}
                  style={{
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
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
                  <span>📧</span>
                  <span>Contact Support</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// StatCard component
const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    primary: { bg: 'rgba(99, 102, 241, 0.1)', text: 'var(--primary)' },
    success: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--info)' }
  };

  const config = colorClasses[color];

  return (
    <div style={{ 
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '12px',
          backgroundColor: config.bg,
          color: config.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {React.cloneElement(icon, { size: 24 })}
        </div>
        <div>
          <p style={{ 
            fontSize: '12px', 
            fontWeight: '600',
            color: 'var(--text-secondary)',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>{title}</p>
          <h4 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            margin: 0
          }}>{value}</h4>
        </div>
      </div>
    </div>
  );
};
