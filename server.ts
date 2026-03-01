import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";

const db = new Database("jobs.db");
const JWT_SECRET = process.env.JWT_SECRET || "ankur-secret-key";

// Ensure uploads directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user',
    is_suspended INTEGER DEFAULT 0,
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
    link_type TEXT DEFAULT 'Other',
    posted_by TEXT NOT NULL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    contact_details TEXT,
    location TEXT,
    skills TEXT,
    experience TEXT,
    education TEXT,
    resume_url TEXT,
    portfolio_url TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Add missing columns to users table if they don't exist
const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
const columnNames = columns.map(c => c.name);

if (!columnNames.includes("role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
}
if (!columnNames.includes("is_suspended")) {
  db.exec("ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0");
}
if (!columnNames.includes("is_public")) {
  db.exec("ALTER TABLE users ADD COLUMN is_public INTEGER DEFAULT 1");
}
if (!columnNames.includes("phone")) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
}

// Migration for jobs table
const jobColumns = db.prepare("PRAGMA table_info(jobs)").all() as any[];
const jobColumnNames = jobColumns.map(c => c.name);
if (!jobColumnNames.includes("user_id")) {
  db.exec("ALTER TABLE jobs ADD COLUMN user_id INTEGER");
}
if (!jobColumnNames.includes("link_type")) {
  db.exec("ALTER TABLE jobs ADD COLUMN link_type TEXT DEFAULT 'Other'");
}

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    
    // Check if user is suspended
    const dbUser: any = db.prepare("SELECT is_suspended FROM users WHERE id = ?").get(user.id);
    if (dbUser && dbUser.is_suspended) {
      return res.status(403).json({ error: "Account suspended. Please contact support." });
    }

    req.user = user;
    next();
  });
};

const authenticateAdmin = (req: any, res: any, next: any) => {
  authenticateToken(req, res, () => {
    const user: any = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: "Admin access required" });
    }
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // Seed default Admin user
  const adminUser: any = db.prepare("SELECT * FROM users WHERE username = 'Admin'").get();
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash("Admin", 10);
    const info = db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)")
      .run("Admin", "admin@ankur.com", hashedPassword, "admin");
    db.prepare("INSERT INTO profiles (user_id, name) VALUES (?, ?)").run(info.lastInsertRowid, "Administrator");
    console.log("Default Admin user created (Admin/Admin)");
  }

  // Promote first user to admin if no admin exists (fallback)
  const adminCount: any = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
  if (adminCount.count === 0) {
    const firstUser: any = db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1").get();
    if (firstUser) {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(firstUser.id);
      console.log(`User ${firstUser.id} promoted to admin`);
    }
  }

  // Upload Routes
  app.post("/api/upload/resume", authenticateToken, upload.single("resume"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.post("/api/upload/photo", authenticateToken, upload.single("photo"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password, phone } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (username, email, password, phone) VALUES (?, ?, ?, ?)");
      const info = stmt.run(username, email, hashedPassword, phone || null);
      
      // Create initial profile
      db.prepare("INSERT INTO profiles (user_id, name) VALUES (?, ?)").run(info.lastInsertRowid, username);
      
      const token = jwt.sign({ id: info.lastInsertRowid, username, email, role: 'user' }, JWT_SECRET);
      res.status(201).json({ token, user: { id: info.lastInsertRowid, username, email, role: 'user' } });
    } catch (error: any) {
      if (error.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { identifier, password } = req.body; // changed email to identifier
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(identifier, identifier);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_public: user.is_public, role: user.role } });
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

  app.post("/api/auth/reset-password", authenticateToken, async (req: any, res) => {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: "New password required" });
    
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
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
    const { title, company, category, location, experience, salary, requirements, link, link_type, posted_by } = req.body;
    
    if (!title || !company || !category || !link || !posted_by) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const stmt = db.prepare(
        "INSERT INTO jobs (title, company, category, location, experience, salary, requirements, link, link_type, posted_by, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const info = stmt.run(title, company, category, location, experience, salary, requirements, link, link_type || 'Other', posted_by, req.user.id);
      res.status(201).json({ id: info.lastInsertRowid, ...req.body });
    } catch (error) {
      res.status(500).json({ error: "Failed to post job" });
    }
  });

  // Profile Routes
  app.get("/api/profile/me", authenticateToken, (req: any, res) => {
    try {
      const profile = db.prepare("SELECT p.*, u.email, u.username, u.is_public, u.role FROM profiles p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?").get(req.user.id);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile/me", authenticateToken, (req: any, res) => {
    const { 
      name, photo_url, contact_details, location, 
      skills, experience, education, resume_url, 
      portfolio_url, linkedin_url, github_url, is_public 
    } = req.body;
    try {
      db.prepare(`
        UPDATE profiles SET 
          name = ?, photo_url = ?, contact_details = ?, location = ?,
          skills = ?, experience = ?, education = ?, resume_url = ?,
          portfolio_url = ?, linkedin_url = ?, github_url = ?,
          updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `).run(
        name, photo_url, contact_details, location,
        skills, experience, education, resume_url,
        portfolio_url, linkedin_url, github_url, req.user.id
      );
      
      if (is_public !== undefined) {
        db.prepare("UPDATE users SET is_public = ? WHERE id = ?").run(is_public ? 1 : 0, req.user.id);
      }
      
      res.json({ message: "Profile updated" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", authenticateAdmin, (req, res) => {
    try {
      const users = db.prepare("SELECT id, username, email, role, is_suspended, created_at FROM users").all();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id/suspend", authenticateAdmin, (req, res) => {
    const { is_suspended } = req.body;
    try {
      db.prepare("UPDATE users SET is_suspended = ? WHERE id = ?").run(is_suspended ? 1 : 0, req.params.id);
      res.json({ message: `User ${is_suspended ? 'suspended' : 'unsuspended'}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM profiles WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM jobs WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.put("/api/admin/users/:id/reset-password", authenticateAdmin, async (req, res) => {
    const { newPassword } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.params.id);
      res.json({ message: "Password reset successful" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.delete("/api/admin/jobs/:id", authenticateAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
      res.json({ message: "Job posting removed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove job posting" });
    }
  });

  app.put("/api/admin/users/:id/clear-socials", authenticateAdmin, (req, res) => {
    try {
      db.prepare(`
        UPDATE profiles 
        SET linkedin_url = NULL, github_url = NULL, portfolio_url = NULL 
        WHERE user_id = ?
      `).run(req.params.id);
      res.json({ message: "Social links removed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear social links" });
    }
  });

  app.put("/api/admin/users/:id/clear-profile", authenticateAdmin, (req, res) => {
    try {
      db.prepare(`
        UPDATE profiles 
        SET skills = NULL, experience = NULL, education = NULL, contact_details = NULL 
        WHERE user_id = ?
      `).run(req.params.id);
      res.json({ message: "Profile content cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear profile content" });
    }
  });

  app.put("/api/admin/users/:id/profile", authenticateAdmin, (req, res) => {
    const { name, email, role, photo_url, contact_details, location, skills, experience, education, resume_url, portfolio_url, linkedin_url, github_url, is_public } = req.body;
    try {
      db.prepare(`
        UPDATE profiles SET 
          name = ?, photo_url = ?, contact_details = ?, location = ?, 
          skills = ?, experience = ?, education = ?, resume_url = ?, 
          portfolio_url = ?, linkedin_url = ?, github_url = ?, is_public = ?
        WHERE user_id = ?
      `).run(name, photo_url, contact_details, location, skills, experience, education, resume_url, portfolio_url, linkedin_url, github_url, is_public ? 1 : 0, req.params.id);
      
      if (email || role) {
        db.prepare("UPDATE users SET email = ?, role = ? WHERE id = ?").run(email, role, req.params.id);
      }
      
      res.json({ message: "User profile updated by admin" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  app.put("/api/admin/jobs/:id", authenticateAdmin, (req, res) => {
    const { title, company, location, category, experience, salary, requirements, link, link_type } = req.body;
    try {
      db.prepare(`
        UPDATE jobs SET 
          title = ?, company = ?, location = ?, category = ?, 
          experience = ?, salary = ?, requirements = ?, link = ?, link_type = ?
        WHERE id = ?
      `).run(title, company, location, category, experience, salary, requirements, link, link_type, req.params.id);
      res.json({ message: "Job updated by admin" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.get("/api/admin/stats", authenticateAdmin, (req, res) => {
    try {
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const totalJobs = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as any;
      const suspendedUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_suspended = 1").get() as any;
      const recentJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE created_at > datetime('now', '-7 days')").get() as any;
      
      res.json({
        totalUsers: totalUsers.count,
        totalJobs: totalJobs.count,
        suspendedUsers: suspendedUsers.count,
        recentJobs: recentJobs.count
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
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
