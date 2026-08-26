import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Lock,
  HardDrive,
  Cpu,
  Database,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  ArrowRight
} from "lucide-react";
import fileService from "../services/file.service";

export const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(0); // 0..5
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState("");

  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    setError("");
    setUploadResult(null);

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Invalid file format: Please select a valid PDF document (.pdf).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds maximum allowed limit of 50MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError("");
    setUploadProgress(0);
    setPipelineStep(1); // Encrypting

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Simulate step progression alongside real upload
      const stepTimer = setInterval(() => {
        setPipelineStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 600);

      const res = await fileService.uploadFile(formData, (percent) => {
        setUploadProgress(percent);
      });

      clearInterval(stepTimer);
      setPipelineStep(5); // Metadata Stored

      if (res.success && res.data) {
        setUploadResult(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to process file upload pipeline.");
      setPipelineStep(0);
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
          <UploadCloud className="w-7 h-7 text-cyan-400" />
          <span>Upload & Encrypt PDF Document</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Encrypt PDF using AES-256-GCM, upload payload to IPFS, and register SHA-256 hash on Ethereum blockchain.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Box */}
      {!uploadResult ? (
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-10 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
              selectedFile
                ? "bg-slate-900/90 border-cyan-500/60 shadow-xl shadow-cyan-950/30"
                : "bg-slate-900/40 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-slate-100 text-lg">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-xs text-rose-400 hover:underline font-medium"
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div>
                  <p className="font-bold text-slate-200 text-base">Drag & Drop PDF File Here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse local files (Max 50MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Step Progress Display */}
          {isUploading && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Processing Upload Pipeline...</span>
                <span className="font-mono text-cyan-400">{uploadProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* Pipeline Step Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                {[
                  { step: 1, label: "PDF Encrypted", icon: Lock },
                  { step: 2, label: "Uploaded to IPFS", icon: HardDrive },
                  { step: 3, label: "SHA-256 Generated", icon: Cpu },
                  { step: 4, label: "Blockchain Registered", icon: Database },
                  { step: 5, label: "Metadata Stored", icon: ShieldCheck }
                ].map((s) => {
                  const Icon = s.icon;
                  const isDone = pipelineStep >= s.step;
                  return (
                    <div
                      key={s.step}
                      className={`p-2.5 rounded-xl border text-[11px] font-medium flex items-center gap-2 transition-colors ${
                        isDone
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-950/40 border-slate-800 text-slate-600"
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isDone ? "text-emerald-400" : "text-slate-700"}`} />
                      <span className="truncate">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {selectedFile && !isUploading && (
            <button
              onClick={handleUploadSubmit}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-base shadow-xl shadow-cyan-500/25 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              <span>Encrypt & Register PDF on Blockchain</span>
            </button>
          )}
        </div>
      ) : (
        /* Upload Success Result Card */
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/40 space-y-6 shadow-2xl shadow-emerald-950/30 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-100">Upload & Blockchain Registration Complete</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{uploadResult.originalFileName}</p>
            </div>
          </div>

          {/* Success Verification Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✓ PDF Encrypted</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✓ Uploaded to IPFS</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✓ SHA-256 Generated</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✓ Blockchain Registered</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✓ Metadata Stored</span>
            </div>
          </div>

          {/* Detailed Output Fields */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">File ID</label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-cyan-300">
                <span className="truncate">{uploadResult.fileId}</span>
                <button
                  onClick={() => copyToClipboard(uploadResult.fileId, "fileId")}
                  className="p-1 hover:text-white transition-colors"
                >
                  {copiedField === "fileId" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">IPFS CID</label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-blue-300">
                <span className="truncate">{uploadResult.ipfsCid}</span>
                <button
                  onClick={() => copyToClipboard(uploadResult.ipfsCid, "ipfsCid")}
                  className="p-1 hover:text-white transition-colors"
                >
                  {copiedField === "ipfsCid" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Encrypted Payload SHA-256 Hash</label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-indigo-300">
                <span className="truncate">{uploadResult.sha256Hash}</span>
                <button
                  onClick={() => copyToClipboard(uploadResult.sha256Hash, "sha256Hash")}
                  className="p-1 hover:text-white transition-colors"
                >
                  {copiedField === "sha256Hash" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Ethereum Blockchain Transaction Hash</label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-emerald-300">
                <span className="truncate">{uploadResult.blockchainTxHash}</span>
                <button
                  onClick={() => copyToClipboard(uploadResult.blockchainTxHash, "blockchainTxHash")}
                  className="p-1 hover:text-white transition-colors"
                >
                  {copiedField === "blockchainTxHash" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setUploadResult(null);
                setSelectedFile(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Upload Another PDF
            </button>

            <Link
              to="/my-files"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span>View My Files</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
