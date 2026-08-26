import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  LayoutDashboard,
  UploadCloud,
  FileText,
  User,
  LogOut,
  Cpu,
  Database,
  Lock,
  Activity
} from "lucide-react";

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Upload File", path: "/upload", icon: UploadCloud },
    { label: "My Files", path: "/my-files", icon: FileText },
    { label: "Profile", path: "/profile", icon: User }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between p-4 sticky top-0 h-screen z-40 backdrop-blur-xl">
        <div>
          {/* Logo Header */}
          <Link to="/dashboard" className="flex items-center gap-3 px-2 py-3 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 text-lg">
                CipherChain
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">AES-256 + IPFS + EVM</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/50"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Live System Status Indicators */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-cyan-400" /> Hardhat EVM</span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400"><Activity className="w-2.5 h-2.5 animate-pulse" /> 31337</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-blue-400" /> Pinata IPFS</span>
              <span className="text-[10px] font-mono text-emerald-400">Online</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-indigo-400" /> Master Key</span>
              <span className="text-[10px] font-mono text-cyan-400">AES-256</span>
            </div>
          </div>

          {/* User Profile Card & Logout */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>SECURE CLOUD DEPLOYMENT • ENCRYPTION & BLOCKCHAIN ACTIVE</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/upload"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Upload PDF</span>
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="p-6 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
