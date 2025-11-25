import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { auth } from "../firebase";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:5000";

const WORK_ROLES = [
  "Software Engineer",
  "DevOps Engineer",
  "Business Analyst",
  "Product Manager",
  "UI/UX Designer",
  "QA Engineer",
  "Data Scientist",
  "Student",
  "Intern",
  "Project Manager"
];

export default function GroupManagement({ user }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Group Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  // Add Member State
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("Software Engineer");

  // Delete/Leave Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadGroups();
  }, [user, navigate]);

  const loadGroups = async () => {
    // Check cache first
    const cacheKey = `groups_${user.uid}`;
    const cacheTimeKey = `groups_${user.uid}_time`;
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const now = Date.now();
    
    if (cachedTime && (now - parseInt(cachedTime)) < 30000) {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setGroups(JSON.parse(cachedData));
        setLoading(false);
        return; // Use cached data
      }
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/groups/user/${user.uid}?limit=20`);
      const loadedGroups = response.data.groups || [];
      console.log("📥 Loaded groups:", loadedGroups);
      
      // Names are now included from backend, no need for individual fetches
      
      if (loadedGroups.length > 0 && loadedGroups[0].members) {
        console.log("👥 First group members:", loadedGroups[0].members);
      }
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(loadedGroups));
      localStorage.setItem(cacheTimeKey, now.toString());
      
      setGroups(loadedGroups);
    } catch (err) {
      console.error("Error loading groups:", err);
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError("Group name is required");
      return;
    }

    // Optimistic UI update - add group immediately
    const tempGroup = {
      id: `temp-${Date.now()}`,
      name: newGroupName,
      description: newGroupDescription,
      admin: {
        id: user.uid,
        email: user.email,
        name: user.username || user.email
      },
      members: [],
      createdAt: new Date().toISOString(),
      _pending: true // Mark as pending
    };

    setGroups([tempGroup, ...groups]);
    setShowCreateModal(false);
    const savedGroupName = newGroupName;
    const savedGroupDescription = newGroupDescription;
    setNewGroupName("");
    setNewGroupDescription("");

    try {
      setLoading(true);
      setError("");
      const response = await axios.post(`${BACKEND_URL}/api/groups`, {
        name: savedGroupName,
        description: savedGroupDescription,
        adminId: user.uid,
        adminEmail: user.email,
        adminName: user.username || user.email
      });

      // Replace temp group with real group from server
      setGroups(prevGroups => 
        prevGroups.map(g => g.id === tempGroup.id ? response.data.group : g)
      );
      setSuccess("Group created successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.response?.data?.error || "Failed to create group");
      // Remove temp group on error
      setGroups(prevGroups => prevGroups.filter(g => g.id !== tempGroup.id));
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!memberUserId.trim()) {
      setError("User ID is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // First, fetch the user's info to get their username
      let userName = "";
      try {
        const userInfoResponse = await axios.get(`${BACKEND_URL}/api/users/${memberUserId.trim()}`);
        userName = userInfoResponse.data.username || userInfoResponse.data.email;
      } catch (userErr) {
        console.error("Could not fetch user info:", userErr);
        setError("User ID not found. Please ensure the user has registered.");
        setLoading(false);
        return;
      }
      
      const response = await axios.post(`${BACKEND_URL}/api/groups/${selectedGroup.id}/members`, {
        userId: memberUserId.trim(),
        name: userName,
        role: memberRole,
        addedBy: user.uid
      });

      setSuccess("Member added successfully!");
      setSelectedGroup(response.data.group);
      
      // Invalidate cache
      localStorage.removeItem(`groups_${user.uid}`);
      localStorage.removeItem(`groups_${user.uid}_time`);
      
      // Update groups list
      setGroups(groups.map(g => g.id === selectedGroup.id ? response.data.group : g));
      
      setMemberUserId("");
      setMemberRole("Software Engineer");
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error adding member:", err);
      setError(err.response?.data?.error || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    // Check if current user is the admin
    if (selectedGroup.adminId !== user.uid) {
      setError("Only the group admin can update member roles");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await axios.patch(
        `${BACKEND_URL}/api/groups/${selectedGroup.id}/members/${memberId}`,
        { role: newRole }
      );

      setSuccess("Role updated successfully!");
      setSelectedGroup(response.data.group);
      
      // Invalidate cache
      localStorage.removeItem(`groups_${user.uid}`);
      localStorage.removeItem(`groups_${user.uid}_time`);
      
      setGroups(groups.map(g => g.id === selectedGroup.id ? response.data.group : g));
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating role:", err);
      setError(err.response?.data?.error || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId) => {
    // Check if current user is the admin
    if (selectedGroup.adminId !== user.uid) {
      setError("Only the group admin can remove members");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setItemToDelete({ type: 'removeMember', id: memberId });
    setShowDeleteModal(true);
  };

  const confirmRemoveMember = async (memberId) => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.delete(
        `${BACKEND_URL}/api/groups/${selectedGroup.id}/members/${memberId}`
      );

      setSuccess("Member removed successfully!");
      setSelectedGroup(response.data.group);
      
      // Invalidate cache
      localStorage.removeItem(`groups_${user.uid}`);
      localStorage.removeItem(`groups_${user.uid}_time`);
      
      setGroups(groups.map(g => g.id === selectedGroup.id ? response.data.group : g));
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error removing member:", err);
      setError(err.response?.data?.error || "Failed to remove member");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };
  
  const handleDeleteGroup = (groupId) => {
    setItemToDelete({ type: 'deleteGroup', id: groupId });
    setShowDeleteModal(true);
  };

  const handleLeaveGroup = (groupId) => {
    setItemToDelete({ type: 'leaveGroup', id: groupId });
    setShowDeleteModal(true);
  };

  const confirmDeleteGroup = async (groupId) => {
    try {
      setLoading(true);
      setError("");
      await axios.delete(`${BACKEND_URL}/api/groups/${groupId}`);

      setSuccess("Group deleted successfully!");
      
      // Invalidate cache
      localStorage.removeItem(`groups_${user.uid}`);
      localStorage.removeItem(`groups_${user.uid}_time`);
      
      setGroups(groups.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting group:", err);
      setError(err.response?.data?.error || "Failed to delete group");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const confirmLeaveGroup = async (groupId) => {
    try {
      setLoading(true);
      setError("");
      
      // Find the member entry for current user
      const group = groups.find(g => g.id === groupId);
      const memberEntry = group?.members?.find(m => m.userId === user.uid);
      
      if (!memberEntry) {
        setError("You are not a member of this group");
        setLoading(false);
        return;
      }

      await axios.delete(`${BACKEND_URL}/api/groups/${groupId}/members/${memberEntry.id}`);

      setSuccess("Left group successfully!");
      
      // Invalidate cache
      localStorage.removeItem(`groups_${user.uid}`);
      localStorage.removeItem(`groups_${user.uid}_time`);
      
      setGroups(groups.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error leaving group:", err);
      setError(err.response?.data?.error || "Failed to leave group");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const updateAdminRole = async (newRole) => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.put(`${BACKEND_URL}/api/groups/${selectedGroup.id}/admin-role`, {
        adminRole: newRole
      });

      setSuccess("Your role updated successfully!");
      
      // Invalidate cache
      localStorage.removeItem(`groups_${user.uid}`);
      localStorage.removeItem(`groups_${user.uid}_time`);
      
      const updatedGroup = { ...selectedGroup, adminRole: newRole };
      setSelectedGroup(updatedGroup);
      setGroups(groups.map(g => g.id === selectedGroup.id ? updatedGroup : g));
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating admin role:", err);
      setError(err.response?.data?.error || "Failed to update admin role");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="page group-management-page">
      <div className="page-header">
        <h1>👥 Group Management</h1>
        <p className="subtitle">Create and manage your teams</p>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      <div className="group-management-container">
        {/* Left Sidebar - Groups List */}
        <div className="groups-sidebar">
          <div className="sidebar-header">
            <h3>Your Groups</h3>
            <button 
              className="btn btn-primary btn-small"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ New Group
            </button>
          </div>

          {loading && groups.length === 0 ? (
            <div className="loading-state">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-slate-300 text-lg mb-4">No groups yet</p>
              <button 
                className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
                onClick={() => setShowCreateModal(true)}
              >
                Create Your First Group
              </button>
            </div>
          ) : (
            <div className="groups-list">
              {groups.map(group => (
                <div
                  key={group.id}
                  className={`group-card ${selectedGroup?.id === group.id ? 'active' : ''}`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="group-info">
                    <h4>{group.name}</h4>
                    <p className="group-meta">
                      {group.members?.length || 0} members • {group.adminId === user.uid ? 'Admin' : 'Member'}
                    </p>
                  </div>
                  {/* Show Delete button for admin, Leave button for members */}
                  {group.adminId === user.uid ? (
                    <button
                      className="btn-delete-group"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                      title="Delete group"
                    >
                      🗑️
                    </button>
                  ) : (
                    <button
                      className="btn-leave-group"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveGroup(group.id);
                      }}
                      title="Leave group"
                    >
                      🚪
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Content - Group Details */}
        <div className="group-details">
          {!selectedGroup ? (
            <div className="empty-state">
              <h3>Select a group to manage</h3>
              <p>Choose a group from the sidebar to view and manage members</p>
            </div>
          ) : (
            <>
              <div className="group-header">
                <div>
                  <h2>{selectedGroup.name}</h2>
                  {selectedGroup.description && (
                    <p className="group-description">{selectedGroup.description}</p>
                  )}
                  <div className="group-info-badges">
                    <span className="badge">
                      👤 Admin: {selectedGroup.adminName || selectedGroup.adminEmail}
                      {selectedGroup.adminRole && (
                        <span style={{ 
                          marginLeft: "8px", 
                          padding: "2px 6px", 
                          background: "rgba(102, 126, 234, 0.2)", 
                          borderRadius: "4px",
                          fontSize: "0.85em",
                          fontWeight: "600"
                        }}>
                          ({selectedGroup.adminRole})
                        </span>
                      )}
                    </span>
                    <span className="badge">📅 Created: {new Date(selectedGroup.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Admin Role Selection - Only show to admin */}
              {selectedGroup.adminId === user.uid && (
                <div className="admin-role-section">
                  <h3>👑 Your Role</h3>
                  <p className="form-hint">Select your role in this project to be included in task assignments</p>
                  <div className="form-group">
                    <label htmlFor="adminRole">Admin Role</label>
                    <select
                      id="adminRole"
                      value={selectedGroup.adminRole || "Software Engineer"}
                      onChange={(e) => updateAdminRole(e.target.value)}
                      disabled={loading}
                    >
                      {WORK_ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Add Member Form - Only show to admin */}
              {selectedGroup.adminId === user.uid && (
                <div className="add-member-section">
                  <h3>➕ Add New Member</h3>
                  <form onSubmit={addMember} className="add-member-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="memberUserId">User ID *</label>
                      <input
                        id="memberUserId"
                        type="text"
                        value={memberUserId}
                        onChange={(e) => setMemberUserId(e.target.value)}
                        placeholder="Paste user's unique ID here"
                        required
                        disabled={loading}
                      />
                      <small className="form-hint">
                        Ask the user to copy their User ID from their profile
                      </small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="memberRole">Work Role *</label>
                      <select
                        id="memberRole"
                        value={memberRole}
                        onChange={(e) => setMemberRole(e.target.value)}
                        disabled={loading}
                      >
                        {WORK_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      Add Member
                    </button>
                  </div>
                </form>
              </div>
              )}

              {/* Members List */}
              <div className="members-section">
                <h3>👥 Team Members ({selectedGroup.members?.length || 0})</h3>
                
                {!selectedGroup.members || selectedGroup.members.length === 0 ? (
                  <div className="empty-state">
                    <p>No members yet. Add your first team member above!</p>
                  </div>
                ) : (
                  <div className="members-list">
                    {selectedGroup.members.map(member => (
                      <div key={member.id} className="member-card">
                        <div className="member-info">
                          <div className="member-avatar">
                            {member.name ? member.name.charAt(0).toUpperCase() : '👤'}
                          </div>
                          <div className="member-details">
                            <h4>{member.name || 'Unknown User'}</h4>
                            <p className="member-id">ID: {member.userId}</p>
                          </div>
                        </div>

                        <div className="member-actions">
                          <div className="role-selector">
                            <label>Role:</label>
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(member.id, e.target.value)}
                              disabled={loading || selectedGroup.adminId !== user.uid}
                              className="role-dropdown"
                            >
                              {WORK_ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>

                          {selectedGroup.adminId === user.uid && (
                            <button
                              className="btn-remove-member"
                              onClick={() => removeMember(member.id)}
                              disabled={loading}
                              title="Remove member"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay-new">
          <div className="modal-content-new">
            <div className="modal-header-new">
              <h3>Create a New Group</h3>
              <p>Organize your projects by creating a group for your team.</p>
              <button className="modal-close-new" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={createGroup} className="modal-form-new">
              <div className="form-group-new">
                <label htmlFor="groupName">Group Name</label>
                <input
                  id="groupName"
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Q4 Marketing Campaign"
                  required
                />
              </div>
              <div className="form-group-new">
                <label htmlFor="groupDescription">Description (Optional)</label>
                <textarea
                  id="groupDescription"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="A brief summary of what this group is for."
                  rows="4"
                ></textarea>
              </div>
              <div className="modal-actions-new">
                <button type="button" className="btn-secondary-new" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-new" disabled={loading}>
                  {loading ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          onConfirm={() => {
            if (itemToDelete.type === 'deleteGroup') {
              confirmDeleteGroup(itemToDelete.id);
            } else if (itemToDelete.type === 'leaveGroup') {
              confirmLeaveGroup(itemToDelete.id);
            } else if (itemToDelete.type === 'removeMember') {
              confirmRemoveMember(itemToDelete.id);
            }
          }}
          title={
            itemToDelete.type === 'deleteGroup' 
              ? 'Delete Group' 
              : itemToDelete.type === 'leaveGroup' 
              ? 'Leave Group' 
              : 'Remove Member'
          }
          message={
            itemToDelete.type === 'deleteGroup'
              ? `Are you sure you want to permanently delete the group? This action cannot be undone.`
              : itemToDelete.type === 'leaveGroup'
              ? `Are you sure you want to leave this group? You will lose access to group projects.`
              : `Are you sure you want to remove this member?`
          }
        />
      )}
    </div>
  );
}