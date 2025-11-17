import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useTheme } from "../contexts/ThemeContext";

const NavLink = ({ to, children }) => {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link to={to} className={`nav-link ${active ? "active" : ""}`}>
      {children}
    </Link>
  );
};

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("tasks");
      localStorage.removeItem("projects");
      localStorage.removeItem("currentProjectId");
      localStorage.removeItem("currentProjectTitle");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand">Smart Scheduling</Link>
      </div>
      <nav className="nav-right">
        {user ? (
          <>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/groups">Groups</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <span 
              className="nav-user" 
              style={{ 
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                background: "#f8fafc",
                borderRadius: "8px",
                color: "#334155",
                fontWeight: "500",
                fontSize: "0.9rem",
                border: "1px solid #e2e8f0",
                cursor: "pointer"
              }}
              title={user.email}
              onClick={() => navigate("/profile")}
            >
              <span style={{ fontSize: "1.1rem" }}>👤</span>
              {user.username || user.email}
            </span>
            <button 
              onClick={handleLogout} 
              className="btn btn-logout" 
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <Link to="/login" className="btn btn-outline" style={{
              padding: "8px 16px",
              border: "2px solid #667eea",
              borderRadius: "6px",
              textDecoration: "none",
              color: "#667eea",
              fontWeight: "500",
              transition: "all 0.2s"
            }}>
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-small">
              Sign Up
            </Link>
          </>
        )}
        
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="theme-toggle"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle dark mode"
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </nav>
    </header>
  );
}
