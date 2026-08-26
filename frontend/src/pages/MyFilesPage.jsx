import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  Download,
  Search,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2
} from "lucide-react";
import fileService from "../services/file.service";
import { DownloadVerificationModal } from "../components/DownloadVerificationModal";

export const MyFilesPage = () => {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDownloadFile, setSelectedDownloadFile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFiles = async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const res = await fileService.getFiles({ page, limit: 10, search: searchQuery });
      if (res.success && res.data) {
        setFiles(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to list files:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(1, search);
  }, [search]);

  const handleDelete = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file from storage?")) return;

    setDeletingId(fileId);
    try {
      await fileService.deleteFile(fileId);
      await fetchFiles(pagination.page, search);
    } catch (err) {
      alert(err.message || "Failed to delete file.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <FileText className="w-7 h-7 text-cyan-400" />
            <span>My Encrypted Files</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage, verify on-chain integrity, and securely download PDF documents</p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Files Table / List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/50">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading encrypted file records...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-700 mx-auto" />
            <p className="text-slate-400 text-sm font-semibold">No files found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload PDF files to encrypt them with AES-256 and register on the Ethereum blockchain.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">File Details</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Upload Date</th>
                  <th className="py-3.5 px-4">Verification Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <Link
                            to={`/files/${file.fileId}`}
                            className="font-semibold text-slate-200 hover:text-cyan-300 transition-colors truncate block"
                          >
                            {file.originalFileName}
                          </Link>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{file.fileId}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-400">
                      {(file.fileSize / 1024).toFixed(1)} KB
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-400">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verified On-Chain</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/files/${file.fileId}`}
                          title="View Details"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`/files/${file.fileId}/verify`}
                          title="Verify On-Demand"
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition-colors text-xs font-medium"
                        >
                          Verify
                        </Link>

                        <button
                          onClick={() => setSelectedDownloadFile(file)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        {file.isOwner && (
                          <button
                            onClick={() => handleDelete(file.fileId)}
                            disabled={deletingId === file.fileId}
                            title="Delete File"
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page <strong className="text-slate-200">{pagination.page}</strong> of <strong className="text-slate-200">{pagination.totalPages}</strong> ({pagination.total} total files)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchFiles(pagination.page - 1, search)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchFiles(pagination.page + 1, search)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Download Verification Modal */}
      {selectedDownloadFile && (
        <DownloadVerificationModal
          file={selectedDownloadFile}
          onClose={() => setSelectedDownloadFile(null)}
        />
      )}
    </div>
  );
};
