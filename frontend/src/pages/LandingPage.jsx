import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Database, Cpu, ArrowRight, CheckCircle2, Key, HardDrive } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="font-extrabold tracking-tight text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              CipherChain
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-slate-300 hover:text-slate-100 text-sm font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wide">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            ZERO-TRUST PDF FILE SHARING ENGINE
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Cloud-Based Secure File Sharing Using <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Blockchain & AES-256 Encryption
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
            Encrypt PDF documents with AES-256-GCM, store payloads immutably on IPFS, generate cryptographically verifiable SHA-256 digests, and anchor integrity records on an Ethereum smart contract.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-base shadow-xl shadow-cyan-500/30 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <span>Start Secure Transfer</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-base hover:bg-slate-800 transition-colors"
            >
              System Login
            </Link>
          </div>
        </div>
      </section>

      {/* Security Architecture Grid */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Multi-Layer Security Architecture</h2>
          <p className="text-slate-400 text-sm">Engineered for absolute zero-knowledge privacy and fail-closed integrity</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-cyan-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100">AES-256-GCM</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every PDF is encrypted using a unique random 256-bit AES key with a 96-bit IV and 128-bit authentication tag.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-blue-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100">IPFS Storage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Only encrypted binary payloads are pinned to IPFS via Pinata. Plaintext PDF bytes never touch decentralized storage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-indigo-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100">SHA-256 Hash</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              A cryptographic SHA-256 digest is generated strictly from the final encrypted payload before decentralized upload.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-emerald-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100">EVM Smart Contract</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              FileRegistry.sol anchors fileId, IPFS CID, and SHA-256 hash on an Ethereum blockchain for immutable tamper verification.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Diagram Banner */}
      <section className="py-12 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="font-mono text-xs text-cyan-400 tracking-wider uppercase">Pipeline Execution Sequence</span>
              <span className="text-xs text-slate-400">Fail-Closed Tamper Verification</span>
            </div>

            <div className="grid md:grid-cols-5 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-cyan-300 block">1. PDF Upload</span>
                <span className="text-slate-400 block text-[11px]">%PDF- Header Validated</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-blue-300 block">2. AES-256-GCM</span>
                <span className="text-slate-400 block text-[11px]">Encrypt Payload Binary</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-indigo-300 block">3. IPFS Pinning</span>
                <span className="text-slate-400 block text-[11px]">Pinata CID Generation</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-emerald-300 block">4. Ethereum Node</span>
                <span className="text-slate-400 block text-[11px]">Register Hash On-Chain</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-purple-300 block">5. Envelope Key</span>
                <span className="text-slate-400 block text-[11px]">Wrap with Master Key</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        <p>© 2026 CipherChain Academic Full-Stack Project. React • Node.js • Prisma • IPFS • Ethereum Solidity.</p>
      </footer>
    </div>
  );
};
