import React, { useState, useEffect } from "react";
import { Plus, ExternalLink, Filter, Briefcase, Building2, User, Calendar, X, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Sparkles, Loader2, MapPin, DollarSign, Award, FileText, Mail, Save, LogIn, LogOut, UserPlus, Lock, Eye, EyeOff, Globe, Linkedin, Github, GraduationCap, Phone, Camera, Upload, Twitter, Instagram, Shield, Trash2, Ban, RefreshCw, CheckCircle2, Users, TrendingUp, Link2Off, Eraser, Link } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Job {
  id: number;
  title: string;
  company: string;
  category: string;
  location: string;
  experience: string;
  salary: string;
  requirements: string;
  link: string;
  link_type: string;
  posted_by: string;
  created_at: string;
}

interface Profile {
  name: string;
  email: string;
  role: string;
  photo_url: string;
  contact_details: string;
  location: string;
  skills: string;
  experience: string;
  education: string;
  resume_url: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
  is_public: boolean;
}

interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_public?: number;
}

const CATEGORIES = ["All", "IT", "Admin", "Marketing", "Sales", "Design", "HR", "Finance", "Other"];
const EXPERIENCE_LEVELS = ["Any", "Entry Level", "Mid Level", "Senior Level", "Lead/Manager"];
const ITEMS_PER_PAGE = 6;

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedExperience, setSelectedExperience] = useState("Any");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [magicLink, setMagicLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "profile" | "admin">("jobs");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"user" | "admin">("user");
  const [adminSubTab, setAdminSubTab] = useState<"users" | "jobs">("users");
  const [isSelfResetModalOpen, setIsSelfResetModalOpen] = useState(false);
  const [selfResetPassword, setSelfResetPassword] = useState("");

  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "", phone: "" });

  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    role: "user",
    photo_url: "",
    contact_details: "",
    location: "",
    skills: "",
    experience: "",
    education: "",
    resume_url: "",
    portfolio_url: "",
    linkedin_url: "",
    github_url: "",
    is_public: true,
  });

  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    category: "IT",
    location: "",
    experience: "Entry Level",
    salary: "",
    requirements: "",
    link: "",
    link_type: "Other",
    posted_by: "",
  });

  useEffect(() => {
    fetchJobs();
    if (token) {
      fetchMyProfile();
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'admin') {
      setViewMode("admin");
      fetchAdminStats();
      fetchAdminUsers();
    } else {
      setViewMode("user");
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = authMode === "login" 
      ? { identifier: authForm.email, password: authForm.password }
      : authForm;
      
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("token", data.token);
        setIsAuthModalOpen(false);
        setAuthForm({ username: "", email: "", password: "", phone: "" });
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    setProfile({ 
      name: "", email: "", role: "user", photo_url: "", contact_details: "", location: "",
      skills: "", experience: "", education: "", resume_url: "",
      portfolio_url: "", linkedin_url: "", github_url: "", is_public: true 
    });
  };

  const fetchMyProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/profile/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || "",
          email: data.email || "",
          role: data.role || "user",
          photo_url: data.photo_url || "",
          contact_details: data.contact_details || "",
          location: data.location || "",
          skills: data.skills || "",
          experience: data.experience || "",
          education: data.education || "",
          resume_url: data.resume_url || "",
          portfolio_url: data.portfolio_url || "",
          linkedin_url: data.linkedin_url || "",
          github_url: data.github_url || "",
          is_public: data.is_public === 1,
        });
        setUser({
          id: data.user_id,
          username: data.username,
          email: data.email,
          role: data.role,
          is_public: data.is_public
        });
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const formData = new FormData();
    formData.append("resume", file);

    setIsUploading(true);
    try {
      const response = await fetch("/api/upload/resume", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({ ...profile, resume_url: data.url });
      } else {
        const error = await response.json();
        alert(error.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const formData = new FormData();
    formData.append("photo", file);

    setIsUploading(true);
    try {
      const response = await fetch("/api/upload/photo", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({ ...profile, photo_url: data.url });
      } else {
        const error = await response.json();
        alert(error.error || "Upload failed");
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      alert("An error occurred during photo upload");
    } finally {
      setIsUploading(false);
    }
  };

  const detectLinkType = (url: string) => {
    if (url.includes("linkedin.com")) return "LinkedIn";
    if (url.includes("twitter.com") || url.includes("x.com")) return "Twitter";
    if (url.includes("instagram.com")) return "Instagram";
    if (url.includes("github.com")) return "GitHub";
    return "Other";
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case "LinkedIn": return <Linkedin size={14} className="text-[#0A66C2]" />;
      case "Twitter": return <Twitter size={14} className="text-[#1DA1F2]" />;
      case "Instagram": return <Instagram size={14} className="text-[#E4405F]" />;
      case "GitHub": return <Github size={14} className="text-[#181717]" />;
      default: return <Globe size={14} className="text-gray-400" />;
    }
  };

  const fetchAdminStats = async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/admin/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchAdminUsers = async () => {
    if (!token || user?.role !== 'admin') return;
    setIsAdminLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data);
      }
    } catch (error) {
      console.error("Error fetching admin users:", error);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleSuspendUser = async (userId: number, isSuspended: boolean) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ is_suspended: !isSuspended })
      });
      if (response.ok) {
        fetchAdminUsers();
      }
    } catch (error) {
      console.error("Error suspending user:", error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!token || !confirm("Are you sure you want to delete this user and all their data?")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        fetchAdminUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleSelfResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfResetPassword || !token) return;
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: selfResetPassword })
      });
      if (response.ok) {
        alert("Password updated successfully");
        setIsSelfResetModalOpen(false);
        setSelfResetPassword("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("An error occurred");
    }
  };

  const handleClearSocials = async (userId: number) => {
    if (!token || !confirm("Are you sure you want to remove all social media links for this user?")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/clear-socials`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        alert("Social links removed");
        fetchAdminUsers();
      }
    } catch (error) {
      console.error("Error clearing socials:", error);
    }
  };

  const handleClearProfile = async (userId: number) => {
    if (!token || !confirm("Are you sure you want to clear this user's profile content (skills, experience, etc.)? This is used to remove spam/abusive content.")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/clear-profile`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        alert("Profile content cleared");
        fetchAdminUsers();
      }
    } catch (error) {
      console.error("Error clearing profile:", error);
    }
  };

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt("Enter new password:");
    if (!newPassword || !token) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      if (response.ok) {
        alert("Password reset successful");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
    }
  };

  const handleRemoveJob = async (jobId: number) => {
    if (!token || !confirm("Are you sure you want to remove this job posting?")) return;
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error("Error removing job:", error);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newJob),
      });
      if (response.ok) {
        fetchJobs();
        setIsModalOpen(false);
        setNewJob({
          title: "",
          company: "",
          category: "IT",
          location: "",
          experience: "Entry Level",
          salary: "",
          requirements: "",
          link: "",
          link_type: "Other",
          posted_by: user?.username || "",
        });
        setMagicLink("");
      }
    } catch (error) {
      console.error("Error posting job:", error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profile),
      });
      if (response.ok) {
        setIsProfileModalOpen(false);
        alert("Profile saved successfully!");
        fetchMyProfile();
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs");
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = [...jobs];

    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter((job) => job.category === selectedCategory);
    }

    // Filter by experience
    if (selectedExperience !== "Any") {
      result = result.filter((job) => job.experience === selectedExperience);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query)
      );
    }

    // Filter by location query
    if (locationQuery.trim()) {
      const lQuery = locationQuery.toLowerCase();
      result = result.filter(
        (job) => job.location?.toLowerCase().includes(lQuery)
      );
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredJobs(result);
    setCurrentPage(1); // Reset to first page on filter/search change
  }, [selectedCategory, selectedExperience, searchQuery, locationQuery, sortOrder, jobs]);

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminUsers();
    }
  }, [activeTab]);

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleMagicExtract = async () => {
    if (!magicLink || !magicLink.startsWith("http")) return;

    setIsExtracting(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract job details from this URL: ${magicLink}. 
        Return ONLY a JSON object with these keys: title, company, category, location, experience, salary, requirements.
        Category MUST be one of: ${CATEGORIES.filter(c => c !== "All").join(", ")}.
        Experience MUST be one of: ${EXPERIENCE_LEVELS.filter(e => e !== "Any").join(", ")}.
        If you can't determine a field, use an empty string or 'Other' for category.`,
        config: {
          responseMimeType: "application/json",
          tools: [{ urlContext: {} }]
        }
      });

      const result = JSON.parse(response.text || "{}");
      if (result.title || result.company) {
        setNewJob(prev => ({
          ...prev,
          title: result.title || prev.title,
          company: result.company || prev.company,
          category: result.category || prev.category,
          location: result.location || prev.location,
          experience: result.experience || prev.experience,
          salary: result.salary || prev.salary,
          requirements: result.requirements || prev.requirements,
          link: magicLink,
          link_type: detectLinkType(magicLink)
        }));
      }
    } catch (error) {
      console.error("Extraction failed:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => setActiveTab("jobs")}
            >
              <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/30">
                <Briefcase className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-display font-bold tracking-tight text-slate-900">ANKUR <span className="text-indigo-600">JOBS</span></h1>
            </motion.div>
            
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
              <button 
                onClick={() => setActiveTab("jobs")}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "jobs" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Find Jobs
              </button>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all text-slate-500 hover:text-slate-700`}
              >
                My Profile
              </button>
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setActiveTab("admin")}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "admin" ? "bg-red-50 text-red-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Admin Panel
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {token ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900">{user?.username}</span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{user?.role}</span>
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-all"
                >
                  <User size={20} />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthMode("login"); setIsAuthModalOpen(true); }}
                className="btn-primary"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === "admin" && user?.role === 'admin' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
                <p className="text-gray-500 mt-1">Platform overview and moderation</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSelfResetModalOpen(true)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                >
                  <Lock size={14} />
                  Change My Password
                </button>
                <button 
                  onClick={() => { fetchAdminStats(); fetchAdminUsers(); }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 ${isAdminLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">Total Users</div>
                    <div className="text-2xl font-bold text-slate-900">{adminStats?.totalUsers || 0}</div>
                  </div>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">Total Jobs</div>
                    <div className="text-2xl font-bold text-slate-900">{adminStats?.totalJobs || 0}</div>
                  </div>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">Avg Salary</div>
                    <div className="text-2xl font-bold text-slate-900">₹{adminStats?.avgSalary || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 border-b border-slate-200">
              <button
                onClick={() => setAdminSubTab("users")}
                className={`pb-4 px-2 text-sm font-bold transition-all relative ${adminSubTab === "users" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                Users Management
                {adminSubTab === "users" && <motion.div layoutId="adminSubTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
              </button>
              <button
                onClick={() => setAdminSubTab("jobs")}
                className={`pb-4 px-2 text-sm font-bold transition-all relative ${adminSubTab === "jobs" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                Jobs Moderation
                {adminSubTab === "jobs" && <motion.div layoutId="adminSubTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
              </button>
            </div>

            {adminSubTab === "users" ? (
              <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                {u.username[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{u.username}</div>
                                <div className="text-xs text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.is_suspended ? (
                              <span className="flex items-center gap-1.5 text-red-500 text-xs font-bold">
                                <Ban size={14} />
                                Suspended
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                                <CheckCircle2 size={14} />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Reset Password"
                              >
                                <Lock size={16} />
                              </button>
                              {u.role !== 'admin' && (
                                <>
                                  <button
                                    onClick={() => handleClearSocials(u.id)}
                                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                    title="Remove Social Links"
                                  >
                                    <Link2Off size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleClearProfile(u.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Clear Profile"
                                  >
                                    <Eraser size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleSuspendUser(u.id, u.is_suspended)}
                                    className={`p-2 rounded-xl transition-all ${u.is_suspended ? 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'}`}
                                    title={u.is_suspended ? "Unsuspend" : "Suspend"}
                                  >
                                    <Ban size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete User"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Job Title</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Posted By</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{job.title}</div>
                            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{job.category}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{job.company}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{job.posted_by}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemoveJob(job.id)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Remove Job"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "jobs" ? (
          <>
            <section className="mb-16 text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-4">
                  Discover Your Future
                </span>
                <h2 className="text-5xl font-display font-bold tracking-tight text-slate-900 mb-6 leading-tight">
                  Find your dream job <br />
                  <span className="text-indigo-600">without the hassle.</span>
                </h2>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Connect with top companies and explore thousands of job opportunities tailored to your skills and experience.
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row items-center gap-3 glass-panel p-3 rounded-[2.5rem]">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Job title, company, or keywords..."
                    className="w-full pl-12 pr-4 py-4 rounded-3xl bg-slate-50/50 border-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative flex-1 w-full">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="City, state, or remote..."
                    className="w-full pl-12 pr-4 py-4 rounded-3xl bg-slate-50/50 border-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                </div>
                <button className="btn-primary w-full sm:w-auto h-full py-4 px-8 rounded-3xl">
                  Search Jobs
                </button>
              </div>
            </section>

            {/* Filters and Sort */}
            <div className="flex flex-col gap-10 mb-12">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-slate-400 mr-2">
                    <Filter size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Category</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2 rounded-2xl text-sm font-semibold transition-all ${
                          selectedCategory === cat
                            ? "nav-item-active"
                            : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-slate-400 mr-2">
                    <ArrowUpDown size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Sort</span>
                  </div>
                  <button
                    onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                    className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                  >
                    {sortOrder === "newest" ? "Newest First" : "Oldest First"}
                    {sortOrder === "newest" ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Post Job
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-slate-400 mr-2">
                  <Award size={18} />
                  <span className="text-sm font-bold uppercase tracking-wider">Experience</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((exp) => (
                    <button
                      key={exp}
                      onClick={() => setSelectedExperience(exp)}
                      className={`px-5 py-2 rounded-2xl text-sm font-semibold transition-all ${
                        selectedExperience === exp
                          ? "nav-item-active"
                          : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Job Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-8 border border-slate-100 animate-pulse h-64" />
                ))}
              </div>
            ) : filteredJobs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence mode="popLayout">
                    {paginatedJobs.map((job) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={job.id}
                        className="glass-panel p-8 rounded-4xl job-card-hover group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl">
                              {job.category}
                            </span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <Calendar size={12} />
                              {new Date(job.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <h3 className="text-xl font-display font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                            {job.title}
                          </h3>
                          
                          <div className="flex items-center gap-2 text-slate-500 font-medium mb-6">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                              <Building2 size={16} />
                            </div>
                            {job.company}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-6">
                            {job.location && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-slate-100">
                                <MapPin size={12} />
                                {job.location}
                              </div>
                            )}
                            {job.experience && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-slate-100">
                                <Award size={12} />
                                {job.experience}
                              </div>
                            )}
                            {job.salary && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                <DollarSign size={12} />
                                {job.salary}
                              </div>
                            )}
                          </div>

                          {job.requirements && (
                            <p className="text-sm text-slate-500 line-clamp-2 mb-8 italic leading-relaxed">
                              "{job.requirements}"
                            </p>
                          )}
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <User size={12} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{job.posted_by}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleRemoveJob(job.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary !px-5 !py-2 !text-xs !rounded-xl"
                            >
                              Apply Now
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-black/5 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                        currentPage === page
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-white text-gray-600 border border-black/5 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-black/5 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
            <p className="text-gray-500">Be the first to post a job opening!</p>
          </div>
        )}
          </>
        ) : null}
        {activeTab === "profile" && <div className="text-center py-20 text-gray-400">Profile content is managed via the profile modal.</div>}
      </main>

      {/* Post Job Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 relative shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold tracking-tight text-slate-900">Post a Job</h2>
                  <p className="text-slate-500 text-sm">Fill in the details to find your next great hire.</p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setMagicLink("");
                  }}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Magic Paste Section */}
              <div className="mb-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <Sparkles className="text-white w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Magic Auto-Fill</span>
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 w-4 h-4" />
                    <input
                      type="url"
                      placeholder="Paste LinkedIn or Naukri link..."
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      value={magicLink}
                      onChange={(e) => {
                        setMagicLink(e.target.value);
                        setNewJob(prev => ({ ...prev, link: e.target.value, link_type: detectLinkType(e.target.value) }));
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isExtracting || !magicLink}
                    onClick={handleMagicExtract}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                  </button>
                </div>
                <p className="text-[10px] text-indigo-400 mt-3 font-medium">We'll use AI to automatically fill the form fields for you!</p>
              </div>

              <form onSubmit={handlePostJob} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Senior Product Designer"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Company</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Acme Inc."
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                      value={newJob.company}
                      onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 appearance-none cursor-pointer"
                      value={newJob.category}
                      onChange={(e) => setNewJob({ ...newJob, category: e.target.value })}
                    >
                      {CATEGORIES.filter(c => c !== "All").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Remote / Bangalore"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                      value={newJob.location}
                      onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Experience</label>
                    <select
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 appearance-none cursor-pointer"
                      value={newJob.experience}
                      onChange={(e) => setNewJob({ ...newJob, experience: e.target.value })}
                    >
                      {EXPERIENCE_LEVELS.filter(e => e !== "Any").map((exp) => (
                        <option key={exp} value={exp}>
                          {exp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Salary Range</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹15L - ₹25L"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                      value={newJob.salary}
                      onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Application Link</label>
                    <input
                      required
                      type="url"
                      placeholder="https://..."
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                      value={newJob.link}
                      onChange={(e) => setNewJob({ ...newJob, link: e.target.value, link_type: detectLinkType(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Requirements (Optional)</label>
                  <textarea
                    placeholder="Briefly list key requirements or skills..."
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 resize-none h-24"
                    value={newJob.requirements}
                    onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-5 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus size={22} /> Post Job Opening</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 relative shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold tracking-tight text-slate-900">Your Profile</h2>
                  <p className="text-slate-500 text-sm">Keep your professional information up to date.</p>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-8">
                {/* Basic Details Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Basic Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          required
                          type="text"
                          placeholder="John Doe"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Photo</label>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="relative w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 shadow-inner">
                          {profile.photo_url ? (
                            <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Camera size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex gap-2">
                            <label className="cursor-pointer px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2">
                              <Upload size={14} />
                              {profile.photo_url ? "Change" : "Upload"}
                              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                            </label>
                            {profile.photo_url && (
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, photo_url: "" })}
                                className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Details</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Phone or secondary email"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={profile.contact_details}
                          onChange={(e) => setProfile({ ...profile, contact_details: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="City, Country"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Details Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Professional Details</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Skills (comma separated)</label>
                    <div className="relative">
                      <Award className="absolute left-4 top-4 text-slate-400 w-4 h-4" />
                      <textarea
                        rows={2}
                        placeholder="React, TypeScript, Node.js, UI Design..."
                        className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 resize-none"
                        value={profile.skills}
                        onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Education</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Degree, University"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={profile.education}
                          onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Resume (PDF/DOC)</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input
                            type="url"
                            placeholder="https://..."
                            className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                            value={profile.resume_url}
                            onChange={(e) => setProfile({ ...profile, resume_url: e.target.value })}
                          />
                        </div>
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-4 rounded-2xl transition-colors flex items-center justify-center min-w-[56px] text-slate-600">
                          {isUploading ? <Loader2 className="animate-spin text-indigo-600" size={20} /> : <Upload size={20} />}
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={isUploading} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Experience Summary</label>
                    <textarea
                      rows={3}
                      placeholder="Briefly describe your work history..."
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 resize-none"
                      value={profile.experience}
                      onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                    />
                  </div>
                </div>

                {/* Social & Links Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Social & Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Portfolio</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="url"
                          placeholder="Website"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={profile.portfolio_url}
                          onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">LinkedIn</label>
                      <div className="relative">
                        <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="url"
                          placeholder="Profile"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={profile.linkedin_url}
                          onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">GitHub</label>
                      <div className="relative">
                        <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="url"
                          placeholder="Profile"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={profile.github_url}
                          onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl shadow-sm ${profile.is_public ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                      {profile.is_public ? <Eye size={20} /> : <EyeOff size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Profile Visibility</p>
                      <p className="text-xs text-slate-500">{profile.is_public ? "Your profile is visible to recruiters" : "Your profile is hidden from recruiters"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, is_public: !profile.is_public })}
                    className={`w-14 h-8 rounded-full transition-all relative ${profile.is_public ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-300"}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${profile.is_public ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-5 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save size={22} /> Update Profile Settings</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold tracking-tight text-slate-900">
                    {authMode === "login" ? "Welcome Back" : authMode === "register" ? "Create Account" : "Reset Password"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {authMode === "login" ? "Login to manage your profile and jobs" : authMode === "register" ? "Join our community of professionals" : "Enter your email to reset password"}
                  </p>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                {authMode === "register" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          required
                          type="text"
                          placeholder="johndoe"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={authForm.username}
                          onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                          value={authForm.phone}
                          onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                    {authMode === "login" ? "Username or Email" : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      required
                      type={authMode === "login" ? "text" : "email"}
                      placeholder={authMode === "login" ? "Admin or john@example.com" : "john@example.com"}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    />
                  </div>
                </div>
                {authMode !== "forgot" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                      {authMode === "login" && (
                        <button
                          type="button"
                          onClick={() => setAuthMode("forgot")}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-5 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 mt-4"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (authMode === "login" ? "Sign In" : authMode === "register" ? "Create Account" : "Send Reset Link")}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500">
                  {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
                  <button
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    className="ml-2 font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    {authMode === "login" ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Self Password Reset Modal */}
      <AnimatePresence>
        {isSelfResetModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSelfResetModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 relative shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900">Change Password</h2>
                  <p className="text-slate-500 text-xs mt-1">Secure your account with a new password.</p>
                </div>
                <button
                  onClick={() => setIsSelfResetModalOpen(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSelfResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900"
                      value={selfResetPassword}
                      onChange={(e) => setSelfResetPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-5 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 mt-4"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save size={20} /> Update Password</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
