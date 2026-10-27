
"use strict";

const express = require("express");
const session = require("express-session");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const PORT = process.env.PORT || 10000;
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    })
  : null;
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

// Faili za duka zilizopo ndani ya public/
app.use(express.static(path.join(__dirname, "public")));

// Ukurasa mkuu wa duka
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Kupima kama server inafanya kazi
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FUNDI-DIGITAL STORE server is running"
  });
});
app.get("/api/db-health", async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      success: false,
      database: "not_configured"
    });
  }

  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      database: "connected",
      message: "Neon database connected"
    });
  } catch (error) {
    console.error("Database check failed:", error.message);

    return res.status(503).json({
      success: false,
      database: "disconnected",
      message: "Database connection failed"
    });
  }
});
// Kuingia Admin
app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({
      success: false,
      message: "Admin password haijawekwa."
    });
  }

  const password = String(req.body.password || "");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Nenosiri si sahihi."
    });
  }

  req.session.isAdmin = true;

  return res.json({
    success: true,
    message: "Umeingia Admin kwa mafanikio."
  });
});

// Kutoka Admin
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Imeshindikana kutoka Admin."
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      success: true,
      message: "Umetoka Admin."
  });
});

// Kushughulikia kurasa ambazo hazijapatikana
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ukurasa au huduma haijapatikana."
  });
});

// Kuanzisha server kwenye port ya Render
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `FUNDI-DIGITAL STORE inaendesha kwenye port ${PORT}`
  );
});
