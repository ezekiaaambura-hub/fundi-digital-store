
"use strict";

const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const app = express();

app.set("trust proxy", 1);

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

  req.session.save((error) => {
    if (error) {
      console.error("Admin session save failed:", error.message);

      return res.status(500).json({
        success: false,
        message: "Kikao cha Admin hakijahifadhiwa. Jaribu tena."
      });
    }

        return res.json({
      success: true,
      message: "Umeingia Admin kwa mafanikio."
    });
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
});

/* ===== MFUMO WA ODA ZA FUNDI-DIGITAL STORE ===== */

async function ensureOrdersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_orders (
      id BIGSERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      product TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_reference TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      download_token_hash TEXT
    )
  `);

  await pool.query(`
    ALTER TABLE store_orders
    ADD COLUMN IF NOT EXISTS download_token_hash TEXT
  `);
}


 function requireAdmin(req, res, next) {
  if (!req.session || req.session.isAdmin !== true) {
    return res.status(401).json({
      success: false,
      message: "Tafadhali ingia Admin kwanza."
    });
  }

  next();
}

// Mteja anatuma oda
app.post("/api/orders", async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      success: false,
      message: "Database haijaunganishwa."
    });
  }

  const customerName = String(req.body.customerName || "").trim();
  const phone = String(req.body.phone || "").trim();
  const product = String(req.body.product || "").trim();
  const reference = String(req.body.paymentReference || "").trim();

  const products = {
    "Mfumo wa MikroTik": 30000,
    "Programu ya kuflash simu": 5000
  };

  if (
    customerName.length < 2 ||
    customerName.length > 100 ||
    phone.length < 7 ||
    phone.length > 25 ||
    !Object.prototype.hasOwnProperty.call(products, product) ||
    reference.length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Taarifa za oda si sahihi."
    });
  }

  try {
    await ensureOrdersTable();

    const result = await pool.query(
      `INSERT INTO store_orders
       (customer_name, phone, product, amount, payment_reference)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, created_at`,
      [
        customerName,
        phone,
        product,
        products[product],
        reference || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Oda imehifadhiwa. Subiri malipo yakaguliwe.",
      order: result.rows[0]
    });
  } catch (error) {
    console.error("Order creation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Oda haijahifadhiwa. Jaribu tena."
    });
  }
});

// Admin anaona oda zote
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      success: false,
      message: "Database haijaunganishwa."
    });
  }

  try {
    await ensureOrdersTable();

    const result = await pool.query(
      `SELECT id, customer_name, phone, product, amount,
              payment_reference, status, created_at
       FROM store_orders
       ORDER BY created_at DESC
       LIMIT 200`
    );

    return res.json({
      success: true,
      orders: result.rows
    });
  } catch (error) {
    console.error("Loading orders failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Oda hazikuweza kupakiwa."
    });
  }
});

// Admin anabadilisha hali ya oda baada ya kukagua malipo
app.patch(
  "/api/admin/orders/:id/status",
  requireAdmin,
  async (req, res) => {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database haijaunganishwa."
      });
    }

    const id = Number(req.params.id);
    const status = String(req.body.status || "").toUpperCase();

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !["APPROVED", "REJECTED"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Oda au hali si sahihi."
      });
    }

    try {
      await ensureOrdersTable();

      const result = await pool.query(
        `UPDATE store_orders
         SET status = $1
         WHERE id = $2
         RETURNING id, status`,
        [status, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Oda haijapatikana."
        });
      }

      return res.json({
        success: true,
        message: "Hali ya oda imebadilishwa.",
        order: result.rows[0]
      });
    } catch (error) {
      console.error("Updating order failed:", error.message);

      return res.status(500).json({
        success: false,
        message: "Hali ya oda haikuweza kubadilishwa."
      });
    }
  }
);

/* ===== MWISHO WA MFUMO WA ODA ===== */

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
