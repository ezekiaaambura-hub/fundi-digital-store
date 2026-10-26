
"use strict";

const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-before-launch",
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
