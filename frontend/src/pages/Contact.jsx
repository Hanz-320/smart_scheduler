import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = "http://localhost:5000";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, succeeded, failed
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/contact`, {
        name,
        email,
        message,
      });

      if (response.status === 201) {
        setStatus("succeeded");
        setName("");
        setEmail("");
        setMessage("");
      }
    } catch (err) {
      setStatus("failed");
      setError(err.response?.data?.error || "Something went wrong.");
      console.error("Contact form error:", err);
    }
  };

  return (
    <div className="page contact-page">
      <h2>Contact / Feedback</h2>
      <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-secondary)' }}>
        Have a question or feedback? Fill out the form below.
      </p>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Message</label>
          <textarea 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            rows="6"
            required 
          />
        </div>

        <div className="form-actions">
          <button 
            className="btn primary" 
            type="submit" 
            disabled={status === "loading"}
          >
            {status === "loading" ? "Submitting..." : "Submit"}
          </button>
        </div>

        {status === "succeeded" && (
          <div className="alert alert-success" style={{ marginTop: '16px' }}>
            ✅ Thanks for your message! We'll get back to you soon.
          </div>
        )}
        {status === "failed" && (
          <div className="alert alert-error" style={{ marginTop: '16px' }}>
            ❌ Error: {error}
          </div>
        )}
      </form>
    </div>
  );
}
