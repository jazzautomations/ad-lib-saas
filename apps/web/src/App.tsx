import React from "react";

export function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#f0f0f0", fontFamily: "'DM Sans', sans-serif" }}>
      <header style={{ padding: "12px 24px", borderBottom: "1px solid #1d1d1d", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, color: "#e63946" }}>
          AD<span style={{ color: "#f0f0f0" }}>.LIB</span>
          <span style={{ fontSize: 12, color: "#555", marginLeft: 8, fontFamily: "'DM Mono', monospace" }}>STUDIO</span>
        </span>
        <span style={{ fontSize: 11, color: "#555", marginLeft: "auto", fontFamily: "'DM Mono', monospace" }}>
          SaaS · Agentic Creative Engine
        </span>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, letterSpacing: 2, lineHeight: "0.95" }}>
          Deploy any ad format<br />
          <span style={{ color: "#e63946" }}>from one source creative.</span>
        </h1>
        <p style={{ fontSize: 16, color: "#999", maxWidth: 540, marginTop: 16, lineHeight: 1.7 }}>
          Upload your video, image, or asset. AD.LIB Studio's agentic pipeline 
          analyzes, strategizes, and generates every ad format — talking heads, 
          demos, UGC, news, street interviews, and more.
        </p>

        <div style={{
          display: "flex", gap: 12, marginTop: 32,
          fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, textTransform: "uppercase"
        }}>
          <a href="/" style={{
            padding: "12px 24px", background: "#e63946", color: "#fff", borderRadius: 6,
            textDecoration: "none", transition: "all .15s"
          }}>Start a Campaign →</a>
          <a href="https://github.com/jazzautomations/ad-lib-saas" target="_blank" style={{
            padding: "12px 24px", border: "1px solid #282828", color: "#999", borderRadius: 6,
            textDecoration: "none", transition: "all .15s"
          }}>GitHub</a>
        </div>

        {/* Format Stats */}
        <div style={{ display: "flex", gap: 2, marginTop: 48 }}>
          {[
            { n: "18", l: "Formats" },
            { n: "60+", l: "Sub-Formats" },
            { n: "6", l: "Render Engines" },
            { n: "3", l: "Funnel Stages" },
          ].map(s => (
            <div key={s.n} style={{
              flex: 1, padding: "16px", textAlign: "center",
              background: "#0e0e0e", border: "1px solid #1d1d1d"
            }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#e63946", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Format Tabl
