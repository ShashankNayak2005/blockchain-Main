import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Database,
  Clock,
  Loader2,
  Copy,
  Check,
  Download,
  Flame,
  RotateCcw
} from "lucide-react";
import fileService from "../services/file.service";
import { DownloadVerificationModal } from "../components/DownloadVerificationModal";

export const VerificationPage = () => {
  const { fileId } = useParams();

  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [isTamperActive, setIsTamperActive] = useState(false);

  const runVerification = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fileService.verifyFile(fileId);
      if (res.success && res.data) {
        setVerificationData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to execute on-chain verification query.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, [fileId]);

  const handleSimulateTamper = async () => {
    setTamperLoading(true);
    try {
      await fileService.simulateTamper(fileId);
      setIsTamperActive(true);
      await runVerification();
    } catch (err) {
      alert(err.message || "Failed to simulate tamper.");
    } finally {
      setTamperLoading(false);
    }
  };

  const handleResetTamper = async () => {
    setTamperLoading(true);
    try {
      await fileService.resetTamper(fileId);
      setIsTamperActive(false);
      await runVerification();
    } catch (err) {
      alert(err.message || "Failed to reset tamper.");
    } finally {
      setTamperLoading(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2000);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span>Executing real-time on-chain SHA-256 integrity audit...</span>
      </div>
    );
  }

  if (error || !verificationData) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Verification Query Error</h2>
        <p className="text-rose-400 font-semibold text-xs">{error || "Verification query failed."}</p>
        <Link to="/my-files" className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300">
          Back to My Files
        </Link>
      </div>
    );
  }

  const { isVerified, verified, currentFileHash, blockchainHash, ipfsCid, verificationTimestamp } = verificationData;
  const isMatched = verified === true || isVerified === true;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/my-files" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Files</span>
        </Link>

        <button
          onClick={runVerification}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
        >
          Re-Audit On-Chain
        </button>
      </div>

      {/* Main Status Banner */}
      <div
        className={`p-8 rounded-3xl border flex items-center gap-5 shadow-2xl transition-all duration-300 ${
          isMatched
            ? "bg-emerald-950/30 border-emerald-500/50 shadow-emerald-950/20"
            : "bg-rose-950/30 border-rose-500/50 shadow-rose-950/20"
        }`}
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isMatched
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
              : "bg-rose-500/20 border border-rose-500/40 text-rose-400"
          }`}
        >
          {isMatched ? <ShieldCheck className="w-9 h-9" /> : <ShieldAlert className="w-9 h-9" />}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-100">
            {isMatched ? "STATUS: ✓ AUTHENTIC" : "STATUS: ✗ FILE TAMPERED"}
          </h1>
          <p className={`text-xs ${isMatched ? "text-emerald-300/80" : "text-rose-300/80"}`}>
            {isMatched
              ? "The encrypted IPFS payload SHA-256 digest matches the canonical Ethereum smart contract record 100%."
              : "File integrity verification failed. The file payload on IPFS has been modified or corrupted."}
          </p>
        </div>
      </div>

      {/* Interactive Tamper-Detection Demonstration Utility */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Tamper-Detection Demonstration Controls</h2>
              <p className="text-xs text-slate-400">Simulate 1-byte payload corruption on IPFS to test fail-closed blockchain verification</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isTamperActive ? (
              <button
                onClick={handleSimulateTamper}
                disabled={tamperLoading}
                className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {tamperLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                <span>Simulate 1-Byte Tamper</span>
              </button>
            ) : (
              <button
                onClick={handleResetTamper}
                disabled={tamperLoading}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {tamperLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Restore Pristine File</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side SHA-256 Hash Audit Comparison */}
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>SHA-256 Hash Digest Comparison Audit</span>
        </h2>

        <div className="space-y-4">
          {/* Canonical Blockchain Hash */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">ORIGINAL HASH (ETHEREUM BLOCKCHAIN)</span>
              <span className="font-mono text-[11px] text-emerald-400">FileRegistry.sol (IMMUTABLE)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-emerald-300">
              <span className="truncate">{blockchainHash}</span>
              <button onClick={() => copyToClipboard(blockchainHash, "chain")} className="p-1 hover:text-white">
                {copiedField === "chain" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Current IPFS Payload Hash */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">CURRENT FILE HASH (IPFS PAYLOAD)</span>
              <span className="font-mono text-[11px] text-blue-400">{ipfsCid}</span>
            </div>
            <div
              className={`flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border font-mono text-xs transition-colors ${
                isMatched ? "border-slate-800 text-cyan-300" : "border-rose-500/50 text-rose-400 bg-rose-950/20"
              }`}
            >
              <span className="truncate">{currentFileHash}</span>
              <button onClick={() => copyToClipboard(currentFileHash, "current")} className="p-1 hover:text-white">
                {copiedField === "current" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Audit Timestamp */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Audit Executed: {new Date(verificationTimestamp).toLocaleString()}
          </span>
          <span className={isMatched ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
            STATUS: {isMatched ? "✓ AUTHENTIC" : "✗ FILE TAMPERED"}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-4">
        {isMatched ? (
          <button
            onClick={() => setShowDownloadModal(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Proceed to Secure Download</span>
          </button>
        ) : (
          <button
            disabled
            className="px-6 py-3 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm cursor-not-allowed flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Download Blocked (Tamper Detected)</span>
          </button>
        )}
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <DownloadVerificationModal
          file={{ fileId, originalFileName: `Document_${fileId}.pdf` }}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
};
