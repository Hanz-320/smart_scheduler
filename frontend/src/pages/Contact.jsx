import React, { useState } from "react";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Non-functional at this stage; just reset
    setName("");
    setEmail("");
    setMessage("");
    alert("Thanks for your message (not sent in this demo).");
  };

  return (
    <div className="page contact-page">
      <h2>Contact / Feedback</h2>
      <form className="contact-form" onSubmit={handleSubmit}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} />

        <div className="form-actions">
          <button className="btn primary" type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
}
