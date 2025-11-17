import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AddTask({ addTask }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [due, setDue] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const newTask = { title, description, priority, assignedTo, due, status: "todo" };
    addTask(newTask);
    // TODO: connect to backend or Firebase in CP2+
    navigate("/dashboard");
  };

  return (
    <div className="page addtask-page">
      <h2>Add Task</h2>
      <form className="task-form" onSubmit={handleSubmit}>
        <label>Task Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

        <label>Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <label>Assigned To</label>
        <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Name or email" />

        <label>Due Date</label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />

        <div className="form-actions">
          <button type="submit" className="btn primary">Save Task</button>
          <button type="button" className="btn ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
