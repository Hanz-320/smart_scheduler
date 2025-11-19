import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import GenerateTasks from "./pages/GenerateTasks";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GroupManagement from "./pages/GroupManagement";
import Profile from "./pages/Profile";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check for authenticated user on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          username: firebaseUser.displayName
        });
        localStorage.setItem("user", JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          username: firebaseUser.displayName
        }));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Initialize tasks from localStorage or use default sample tasks
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("tasks");
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        
        // CLEANUP: Remove any tasks assigned to Alice/Bob/Carol from old sessions
        const forbiddenNames = ["Alice", "Bob", "Carol", "Unknown"];
        const cleanedTasks = parsedTasks.filter(task => {
          const isForbidden = forbiddenNames.includes(task.assignedTo);
          if (isForbidden) {
            console.warn(`🧹 Removed legacy task assigned to ${task.assignedTo}: ${task.title}`);
          }
          return !isForbidden;
        });
        
        return cleanedTasks;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Add a new task (from AddTask page)
  const addTask = (task) => {
    const id = tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    setTasks([...tasks, { ...task, id }]);
  };

  // Update tasks after drag-and-drop or edits
  const updateTasks = (newTasks) => setTasks(newTasks);

  // Protected route wrapper
  const ProtectedRoute = ({ children }) => {
    if (authLoading) {
      return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;
    }
    return user ? children : <Navigate to="/login" replace />;
  };

  if (authLoading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;
  }

  return (
      <Router>
        <div className="app-root">
          <Navbar user={user} setUser={setUser} />
          <main className="main-content">
          <Routes>
            <Route path="/" element={<Home addTasks={(newTasks) => setTasks(newTasks)} user={user} />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login setUser={setUser} />} />
            <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
            <Route path="/dashboard" element={<Dashboard tasks={tasks} setTasks={updateTasks} user={user} />} />
            <Route path="/groups" element={<GroupManagement user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>
          <Footer />
        </div>
      </Router>
  );
}

export default App;
