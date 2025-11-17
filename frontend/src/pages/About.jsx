import React from "react";

export default function About() {
  return (
    <div className="page about-page">
      <h2>About Smart Scheduling Assistant</h2>
      <p>
        This project helps users plan, organize, and visualize project tasks using a
        clean Kanban-style interface. It was developed as a frontend-only prototype
        for a Final Year Project.
      </p>
      <h3>Features</h3>
      <ul>
        <li>Task planning and prioritization</li>
        <li>Kanban board with drag-and-drop</li>
        <li>Local task management and quick add form</li>
      </ul>
      <p className="muted">AI integration and task automation will be introduced in Phase 2 (CP2+).</p>
    </div>
  );
}decodeURI;