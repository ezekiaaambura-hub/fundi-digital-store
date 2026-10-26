
"use strict";

const express = require("express");
const session = require("express-session");

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

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FUNDI-DIGITAL STORE server is running"
  });
});

app.get("/", (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="sw">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>FUNDI-DIGITAL STORE</title>
      <style>
        body {
          margin: 0;
          padding: 24px;
          background: #030806;
          color: #f4fff7;
          font-family: Arial, sans-serif;
          text-align: center;
        }
        main {
          max-width: 650px;
          margin: 50px auto;
          padding: 28px;
          background: #0a1711;
          border: 1px solid #00e676;
          border-radius: 18px;
        }
        h1 { color: #00e676; }
        .tagline { color: #e8c766; }
      </style>
    </head>
    <body>
      <main>
        <h1>FUNDI-DIGITAL STORE</h1>
        <p class="tagline">Mifumo • Programu • Huduma za Kidijitali</p>
        <p>Duka letu la kidijitali linajengwa.</p>
        <p>Bidhaa zitaweza kupakuliwa baada ya malipo kuthibitishwa.</p>
      </main>
    </body>
    </html>
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FUNDI-DIGITAL STORE inaendesha kwenye port ${PORT}`);
});
