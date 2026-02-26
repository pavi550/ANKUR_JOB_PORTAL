import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("jobs.db");
const JWT_SECRET = process.env.JWT_SECRET || "ankur-secret-key";

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    experience TEXT,
    salary TEXT,
    requirements TEXT,
    link TEXT NOT NULL,
    posted_by TEXT NOT NULL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    skills TEXT,
    experience TEXT,
    resume_url TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
      const info = stmt.run(username, email, hashedPassword);
      
      // Create initial profile
      db.prepare("INSERT INTO profiles (user_id, name) VALUES (?, ?)").run(info.lastInsertRowid, username);
      
      const token = jwt.sign({ id: info.lastInsertRowid, username, email }, JWT_SECRET);
      res.status(201).json({ token, user: { id: info.lastInsertRowid, username, email } });
    } catch (error: any) {
      if (error.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_public: user.is_public } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    // Mock password reset
    const { email } = req.body;
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.json({ message: "If an account exists, a reset link has been sent (Mocked)" });
  });

  // Jobs Routes
  app.get("/api/jobs", (req, res) => {
    try {
      const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", authenticateToken, (req: any, res) => {
    const { title, company, category, location, experience, salary, requirements, link, posted_by } = req.body;
    
    if (!title || !company || !category || !link || !posted_by) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const stmt = db.prepare(
        "INSERT INTO jobs (title, company, category, location, experience, salary, requirements, link, posted_by, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const info = stmt.run(title, company, category, location, experience, salary, requirements, link, posted_by, req.user.id);
      res.status(201).json({ id: info.lastInsertRowid, ...req.body });
    } catch (error) {
      res.status(500).json({ error: "Failed to post job" });
    }
  });

  // Profile Routes
  app.get("/api/profile/me", authenticateToken, (req: any, res) => {
    try {
      const profile = db.prepare("SELECT p.*, u.email, u.username, u.is_public FROM profiles p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?").get(req.user.id);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile/me", authenticateToken, (req: any, res) => {
    const { name, skills, experience, resume_url, is_public } = req.body;
    try {
      db.prepare("UPDATE profiles SET name = ?, skills = ?, experience = ?, resume_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?")
        .run(name, skills, experience, resume_url, req.user.id);
      
      if (is_public !== undefined) {
        db.prepare("UPDATE users SET is_public = ? WHERE id = ?").run(is_public ? 1 : 0, req.user.id);
      }
      
      res.json({ message: "Profile updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
