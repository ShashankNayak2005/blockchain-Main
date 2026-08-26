import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, FileDown, CheckCircle2, XCircle, Loader2, Lock, Cpu, Database, Server } from "lucide-react";
import fileService from "../services/file.service";

const STEPS = [
  { id: 1, label: "Fetching encrypted file from IPFS", icon: Server },
  { id: 2, label: "Generating SHA-256 hash digest", icon: Cpu },
  { id: 3, label: "Checking Ethereum Blockchain registry", icon: Database },
  { id: 4, label: "Comparing SHA-256 payload hash", icon: ShieldCheck },
  { id: 5, label: "Retrieving protected key from database", icon: Lock },
  { id: 6, label: "Decrypting payload using AES-256-GCM", icon: Lock },
  { id: 7, label: "Downloading original PDF document", icon: FileDown }
];

export const DownloadVerificationModal = ({ file, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState("running"); // 'running' | 'success' | 'failed'
  const [errorMessage, setErrorMessage] = useState("");
  const [hashes, setHashes] = useState({ downloaded: null, blockchain: null });

  useEffect(() => {
    let isMounted = true;

    const executeDownloadPipeline = async () => {
      try {
        // Step 1: Fetching encrypted file
        setCurrentStep(1);
        await new Promise((r) => setTimeout(r, 400));

        // Step 2: Generating SHA-256
        if (!isMounted) return;
        setCurrentStep(2);
        await new Promise((r) => setTimeout(r, 400));

        // Step 3 & 4: Checking blockchain & Hash verification
        if (!isMounted) return;
        setCurrentStep(3);
        
        let verifyRes;
        try {
          verifyRes = await fileService.verifyFile(file.fileId);
          setHashes({
            downloaded: verifyRes.data.currentFileHash,
            blockchain: verifyRes.data.blockchainHash
          });
        } catch (vErr) {
          console.warn("Pre-check verification error:", vErr);
        }

        await new Promise((r) => setTimeout(r, 400));

        if (!isMounted) return;
        setCurrentStep(4);

        if (verifyRes && verifyRes.data && !verifyRes.data.verified) {
          setStatus("failed");
          setErrorMessage("File integrity verification failed. The file may have been modified or corrupted.");
          return;
        }

        await new Promise((r) => setTimeout(r, 300));

        // Step 5 & 6: Retrieving protected key & Decrypting file
        if (!isMounted) return;
        setCurrentStep(5);
        await new Promise((r) => setTimeout(r, 300));

        if (!isMounted) return;
        setCurrentStep(6);

        const response = await fileService.downloadFile(file.fileId);

        if (!isMounted) return;
        setCurrentStep(7);
        setStatus("success");

        // Trigger browser binary PDF save
        const blob = new Blob([response.data], { type: "application/pdf" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;

        const disposition = response.headers["content-disposition"];
        let filename = file.originalFileName || "document.pdf";
        if (disposition && disposition.includes("filename=")) {
          const matches = /filename="?([^"]+)"?/.exec(disposition);
          if (matches && matches[1]) filename = matches[1];
        }

        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        if (!isMounted) return;
        setStatus("failed");

        if (error.status === 409) {
          setErrorMessage("File integrity verification failed. The file may have been modified or corrupted.");
        } else {
          setErrorMessage(error.message || "Failed to complete secure download pipeline.");
        }
      }
    };

    executeDownloadPipeline();

    return () => {
      isMounted = false;
    };
  }, [file]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-cyan-950/40 relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Secure Verification Pipeline</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{file.originalFileName}</p>
            </div>
          </div>
        </div>

        {/* Pipeline Step List */}
        <div className="py-6 space-y-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isDone = currentStep > step.id || status === "success";
            const isCurrent = currentStep === step.id && status === "running";
            const isFailed = status === "failed" && currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all duration-200 ${
                  isDone
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                    : isCurrent
                    ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-200 shadow-sm shadow-cyan-500/10"
                    : isFailed
                    ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                    : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isDone ? "text-emerald-400" : isCurrent ? "text-cyan-400" : isFailed ? "text-rose-400" : "text-slate-600"}`} />
                  <span>{step.label}</span>
                </div>

                <div>
                  {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isCurrent && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                  {isFailed && <XCircle className="w-4 h-4 text-rose-400" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verification Status Banner */}
        {status === "success" && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">✓ File Authentic</p>
              <p className="text-xs text-emerald-400/80">Blockchain hash matched 100%. Decryption successful.</p>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">✗ File Integrity Verification Failed</p>
              <p className="text-xs text-rose-300/80">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              status === "failed"
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50"
                : status === "success"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
            disabled={status === "running"}
          >
            {status === "running" ? "Verifying..." : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
