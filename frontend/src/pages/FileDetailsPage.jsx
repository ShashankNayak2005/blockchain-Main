import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  Download,
  CheckCircle2,
  Lock,
  HardDrive,
  Database,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  ArrowDown,
  Cpu,
  Layers,
  Key
} from "lucide-react";
import fileService from "../services/file.service";
import { DownloadVerificationModal } from "../components/DownloadVerificationModal";

export const FileDetailsPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [fileDetails, setFileDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fileService.getFile(fileId);
        if (res.success && res.data) {
          setFileDetails(res.data);
        }
      } catch (err) {
        setError(err.message || "Failed to load file details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [fileId]);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2000);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span>Loading secure file metadata...</span>
      </div>
    );
  }

  if (error || !fileDetails) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <p className="text-rose-400 font-semibold text-sm">{error || "File details unavailable."}</p>
        <button onClick={() => navigate("/my-files")} className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300">
          Back to My Files
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/my-files" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Files</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={`/files/${fileDetails.fileId}/verify`}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Verify On-Demand
          </Link>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Secure Download</span>
          </button>
        </div>
      </div>

      {/* Main File Title Card */}
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl shadow-slate-950/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-100">{fileDetails.originalFileName}</h1>
              <p className="text-xs font-mono text-slate-500 mt-1">{fileDetails.fileId}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>On-Chain Verified</span>
          </span>
        </div>
      </div>

      {/* VISUAL ARCHITECTURE FLOW DIAGRAMS */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* 1. UPLOAD ENCRYPTION PIPELINE FLOW */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg shadow-slate-950/30">
          <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Upload & Encryption Pipeline Flow</span>
          </h2>

          <div className="flex flex-col items-center space-y-2 py-2 text-xs">
            <div className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-semibold text-slate-200">
              Original PDF
            </div>
            <ArrowDown className="w-4 h-4 text-cyan-400 animate-bounce" />

            <div className="w-full p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center font-bold text-cyan-300">
              AES-256-GCM Encryption
            </div>
            <ArrowDown className="w-4 h-4 text-cyan-400 animate-bounce" />

            <div className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-semibold text-slate-200">
              Encrypted PDF Payload
            </div>
            <ArrowDown className="w-4 h-4 text-blue-400 animate-bounce" />

            <div className="w-full p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center font-bold text-blue-300">
              Pinata IPFS Network
            </div>
            <ArrowDown className="w-4 h-4 text-indigo-400 animate-bounce" />

            <div className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-semibold text-slate-200">
              SHA-256 Digest Calculation
            </div>
            <ArrowDown className="w-4 h-4 text-emerald-400 animate-bounce" />

            <div className="w-full p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center font-bold text-emerald-300">
              Ethereum Blockchain Storage
            </div>
          </div>
        </div>

        {/* 2. DOWNLOAD & DECRYPTION PIPELINE FLOW */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg shadow-slate-950/30">
          <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure Download & Integrity Flow</span>
          </h2>

          <div className="flex flex-col items-center space-y-2 py-2 text-xs">
            <div className="w-full p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center font-bold text-blue-300">
              Pinata IPFS Fetch
            </div>
            <ArrowDown className="w-4 h-4 text-slate-500" />

            <div className="w-full p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-semibold text-slate-200">
              Encrypted PDF Payload
            </div>
            <ArrowDown className="w-4 h-4 text-slate-500" />

            <div className="w-full p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-semibold text-slate-200">
              SHA-256 Digest Calculation
            </div>
            <ArrowDown className="w-4 h-4 text-slate-500" />

            <div className="w-full p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center font-bold text-indigo-300">
              Blockchain Comparison Audit
            </div>
            <ArrowDown className="w-4 h-4 text-emerald-400" />

            <div className="w-full p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center font-extrabold text-emerald-300">
              ✓ Hashes Match 100%
            </div>
            <ArrowDown className="w-4 h-4 text-emerald-400" />

            <div className="w-full p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center font-bold text-cyan-300">
              Unwrap Protected AES Key
            </div>
            <ArrowDown className="w-4 h-4 text-cyan-400" />

            <div className="w-full p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center font-bold text-cyan-300">
              AES-256-GCM Decryption
            </div>
            <ArrowDown className="w-4 h-4 text-slate-500" />

            <div className="w-full p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-bold text-slate-100">
              Original PDF Document
            </div>
          </div>
        </div>
      </div>

      {/* Cryptographic Metadata Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Document Specifications */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Document Attributes</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">File Size</span>
              <span className="font-mono text-slate-200">{(fileDetails.fileSize / 1024).toFixed(2)} KB</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">MIME Format</span>
              <span className="font-mono text-slate-200">{fileDetails.mimeType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Owner Identity</span>
              <span className="font-mono text-cyan-300">{fileDetails.owner?.name} ({fileDetails.owner?.email})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Uploaded On</span>
              <span className="font-mono text-slate-200">{new Date(fileDetails.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* IPFS Decentralized Storage */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>IPFS Storage Reference</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">Pinata IPFS CID</span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-blue-300">
                <span className="truncate">{fileDetails.ipfsCid}</span>
                <button onClick={() => copyToClipboard(fileDetails.ipfsCid, "cid")} className="p-1 hover:text-white">
                  {copiedField === "cid" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Payload contains strictly AES-256-GCM encrypted bytes. Raw PDF data is never stored on IPFS.
            </p>
          </div>
        </div>
      </div>

      {/* Blockchain Integrity Verification Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Ethereum Smart Contract Audit Record</span>
        </h3>

        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px]">Immutable SHA-256 Digest (On-Chain Target)</span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-indigo-300">
              <span className="truncate">{fileDetails.sha256Hash}</span>
              <button onClick={() => copyToClipboard(fileDetails.sha256Hash, "hash")} className="p-1 hover:text-white">
                {copiedField === "hash" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 text-[11px]">Ethereum Transaction Hash</span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-emerald-300">
              <span className="truncate">{fileDetails.blockchainTxHash}</span>
              <button onClick={() => copyToClipboard(fileDetails.blockchainTxHash, "tx")} className="p-1 hover:text-white">
                {copiedField === "tx" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Download Verification Modal */}
      {showDownloadModal && (
        <DownloadVerificationModal
          file={fileDetails}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
};
