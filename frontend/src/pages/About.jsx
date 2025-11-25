import React from "react";
import { Link } from "react-router-dom";
import { FiZap, FiShield, FiUsers, FiCpu } from "react-icons/fi";

export default function About() {
  return (
    <div className="page about-page" style={{ color: 'var(--text-primary)' }}>
      {/* Hero Section */}
      <section className="hero" style={{ 
        textAlign: 'center', 
        padding: '80px 20px', 
        background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-dark) 100%)',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Work Smarter, Not Harder</h1>
        <p className="tagline" style={{ fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', opacity: 0.9 }}>
          Smart Scheduler is your intelligent partner in productivity, designed to help you and your team achieve more with less effort.
        </p>
      </section>

      {/* Mission Statement */}
      <section style={{ maxWidth: "900px", margin: "60px auto", padding: "0 20px", textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-primary)' }}>Our Mission</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          In a world of endless to-do lists and constant notifications, we believe that true productivity isn't about doing more, but about doing what matters. Our mission is to empower individuals and teams to focus on their most impactful work by automating the tedious parts of project management and providing intelligent insights to guide their day.
        </p>
      </section>

      {/* Why Choose Us Section */}
      <section style={{ background: 'var(--card)', padding: '60px 20px' }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Why Choose Smart Scheduler?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
            <div className="feature-card" style={{ textAlign: 'center' }}>
              <FiCpu size={48} style={{ color: 'var(--accent)', margin: '0 auto 20px auto' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>AI-Powered Task Generation</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Describe your project in plain English and watch as our AI breaks it down into a comprehensive, actionable plan in seconds.</p>
            </div>
            <div className="feature-card" style={{ textAlign: 'center' }}>
              <FiZap size={48} style={{ color: 'var(--accent)', margin: '0 auto 20px auto' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Intelligent Task Assignment</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Our system automatically assigns tasks to the most suitable team members based on their roles and current workload, ensuring a balanced and efficient workflow.</p>
            </div>
            <div className="feature-card" style={{ textAlign: 'center' }}>
              <FiUsers size={48} style={{ color: 'var(--accent)', margin: '0 auto 20px auto' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Seamless Collaboration</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>With intuitive Kanban boards, real-time updates, and clear ownership, your team will always be on the same page.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Our Philosophy Section */}
      <section style={{ maxWidth: "900px", margin: "60px auto", padding: "0 20px" }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-primary)', textAlign: 'center' }}>Our Philosophy</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.7', textAlign: 'center' }}>
          We believe that technology should be a tool that serves you, not the other way around. Smart Scheduler is built on three core principles:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '30px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
          <li style={{ flex: 1, minWidth: '250px', margin: '10px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>Focus over Frenzy</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Prioritize what's important, not just what's urgent.</p>
          </li>
          <li style={{ flex: 1, minWidth: '250px', margin: '10px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>Automation over Admin</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Let the robots handle the grunt work so you can focus on creativity and strategy.</p>
          </li>
          <li style={{ flex: 1, minWidth: '250px', margin: '10px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>Clarity over Chaos</h4>
            <p style={{ color: 'var(--text-secondary)' }}>A clear plan and visible progress are the keys to a calm and productive team.</p>
          </li>
        </ul>
      </section>
    </div>
  );
}