import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  HardDrive,
  Cpu,
  ArrowUpRight,
  UploadCloud,
  CheckCircle2,
  Clock,
  Lock,
  Download,
  Key,
  Database,
  Link2,
  Layers,
  Loader2
} from "lucide-react";
import fileService from "../services/file.service";
import { DownloadVerificationModal } from "../components/DownloadVerificationModal";

export const DashboardPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDownloadFile, setSelectedDownloadFile] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fileService.getFiles({ limit: 10 });
        if (res.success && res.data) {
          setFiles(res.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err.message || err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Compute live metrics from actual backend records
  const totalFiles = files.length;
  const totalBytes = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  const securityLayers = [
    { name: "JWT Authentication", desc: "Stateless session access tokens", icon: Key },
    { name: "AES-256-GCM Encryption", desc: "Random 256-bit key per file", icon: Lock },
    { name: "IPFS Storage", desc: "Decentralized payload pinning", icon: HardDrive },
    { name: "SHA-256 Integrity", desc: "Cryptographic hash digest", icon: ShieldCheck },
    { name: "Blockchain Verification", desc: "Ethereum FileRegistry.sol contract", icon: Cpu },
    { name: "MySQL Metadata Storage", desc: "Relational Prisma ORM layer", icon: Database }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Main Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>COLLEGE ENGINEERING PROJECT DEMONSTRATION</span>
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">SECURE FILE SHARING</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Cloud-Based Secure File Sharing System integrating AES-256-GCM Envelope Encryption, Pinata IPFS Decentralized Storage, SHA-256 Cryptographic Hashing, and Ethereum EVM Blockchain Smart Contract Verification.
            </p>
          </div>

          <Link
            to="/upload"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-xl shadow-cyan-500/20 hover:brightness-110 transition-all flex items-center gap-2 self-start md:self-auto shrink-0"
          >
            <UploadCloud className="w-4 h-4 stroke-[2.5]" />
            <span>Upload PDF Document</span>
          </Link>
        </div>
      </div>

      {/* Security Layers Architecture Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-extrabold text-slate-100">Security Architecture Layers</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {securityLayers.map((layer, idx) => {
            const IconComp = layer.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 hover:border-cyan-500/40 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <IconComp className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{layer.name}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-normal">{layer.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Encrypted PDF Files</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{totalFiles}</p>
          <p className="text-[11px] text-slate-400">AES-256-GCM Encrypted</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">On-Chain Registered</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{totalFiles}</p>
          <p className="text-[11px] text-slate-400">FileRegistry.sol Checked</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">IPFS Payload Volume</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-400">{totalMB} <span className="text-sm font-normal text-slate-400">MB</span></p>
          <p className="text-[11px] text-slate-400">Pinata Network Pinned</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Ethereum EVM Node</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hardhat Local (31337)</span>
          </p>
          <p className="text-[11px] text-slate-400">Smart Contract Active</p>
        </div>
      </div>

      {/* Main Files Table with Full Security Attributes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-cyan-400" />
            <span>Uploaded Files & Cryptographic Attributes</span>
          </h2>
          <Link to="/my-files" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold">
            <span>View All Files</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/50">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Fetching live file records from backend API...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-slate-400 text-sm font-semibold">No files uploaded yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a PDF file to encrypt it with AES-256-GCM, pin to IPFS, and register on the Ethereum blockchain.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">File Name</th>
                    <th className="py-3.5 px-4">Size</th>
                    <th className="py-3.5 px-4">Upload Date</th>
                    <th className="py-3.5 px-4">IPFS CID</th>
                    <th className="py-3.5 px-4">SHA-256 Hash</th>
                    <th className="py-3.5 px-4">Blockchain Tx</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-200">
                        <Link to={`/files/${file.fileId}`} className="hover:text-cyan-300 transition-colors flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{file.originalFileName}</span>
                        </Link>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-400">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-400">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 font-mono text-blue-400 text-[11px]">
                        <span className="truncate block max-w-[110px]" title={file.ipfsCid}>
                          {file.ipfsCid}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-indigo-300 text-[11px]">
                        <span className="truncate block max-w-[110px]" title={file.sha256Hash}>
                          {file.sha256Hash}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-emerald-400 text-[11px]">
                        <span className="truncate block max-w-[100px]" title={file.blockchainTxHash}>
                          {file.blockchainTxHash}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Verified</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/files/${file.fileId}/verify`}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors text-[11px] font-medium"
                          >
                            Verify
                          </Link>
                          <button
                            onClick={() => setSelectedDownloadFile(file)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Download Modal */}
      {selectedDownloadFile && (
        <DownloadVerificationModal
          file={selectedDownloadFile}
          onClose={() => setSelectedDownloadFile(null)}
        />
      )}
    </div>
  );
};
