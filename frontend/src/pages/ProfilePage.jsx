import React from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, ShieldCheck, Key, Lock, Cpu, Database, Server } from "lucide-react";

export const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
          <User className="w-7 h-7 text-cyan-400" />
          <span>User Security Profile</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Authenticated user credentials and system security environment parameters</p>
      </div>

      {/* User Information Card */}
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl shadow-slate-950/50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-2xl flex items-center justify-center">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{user?.name}</h2>
            <p className="text-xs font-mono text-cyan-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-[11px]">User UUID</span>
            <p className="font-mono text-slate-200 truncate">{user?.id}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-[11px]">User Role</span>
            <p className="font-mono text-emerald-400 uppercase font-bold">{user?.role || "USER"}</p>
          </div>
        </div>
      </div>

      {/* Cryptographic Stack Status */}
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span>Active Cryptographic Stack & Environment</span>
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <Lock className="w-4 h-4" />
              <span>Symmetric Cipher</span>
            </div>
            <p className="text-slate-300">AES-256-GCM (256-bit Key, 96-bit IV, 128-bit Auth Tag)</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <Cpu className="w-4 h-4" />
              <span>Integrity Digest</span>
            </div>
            <p className="text-slate-300">SHA-256 Digest generated from final encrypted payload</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Server className="w-4 h-4" />
              <span>Decentralized Storage</span>
            </div>
            <p className="text-slate-300">Pinata Gateway IPFS Content Identifier (CID) Pinning</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Database className="w-4 h-4" />
              <span>Smart Contract Registry</span>
            </div>
            <p className="text-slate-300">FileRegistry.sol deployed on Ethereum EVM Node (Chain 31337)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
