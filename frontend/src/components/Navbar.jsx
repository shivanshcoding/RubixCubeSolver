import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ items = [] }) {
  if (!items.length) return null;

  // map display text to paths
  const routes = {
    "Home": "/",
    "About": "/#about",
    "Solve": "/#solve",
    "Quiz": "/#quiz",
  };

  return (
    <nav
      style={{
        backgroundColor: "#f0f0f0",
        padding: "12px 150px",
        display: "flex",
        alignItems: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        zIndex: 10
      }}
    >
      <ul style={{ display: "flex", alignItems: "center", width: "100%", listStyle: "none", padding: 0, margin: 0 }}>

        {/* logo / title */}
        <li style={{ fontWeight: "bold", fontSize: "20px" }}>
          {items[0]}
        </li>

        {/* nav links */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "3rem", marginRight: "105px" }}>
          {items.slice(1).map((item, idx) => (
            <li key={idx} style={{ fontSize: "18px" }}>
              <Link
                to={routes[item] || "/"}
                style={{ textDecoration: "none", color: "inherit", fontSize: "18px" }}
              >
                {item}
              </Link>
            </li>
          ))}
        </div>

      </ul>
    </nav>
  );
}
