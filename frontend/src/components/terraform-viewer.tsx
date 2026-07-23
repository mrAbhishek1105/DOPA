"use client";

import { useState } from "react";
import { Copy, Check, FileCode, Download } from "lucide-react";

interface TerraformViewerProps {
  files: Record<string, string>;
  onDownloadAll?: () => void;
}

export function TerraformViewer({ files, onDownloadAll }: TerraformViewerProps) {
  const fileNames = Object.keys(files);
  const [activeFile, setActiveFile] = useState<string>(fileNames[0] || "main.tf");
  const [copied, setCopied] = useState(false);

  if (!files || fileNames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/60">
        <FileCode size={36} className="text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm font-medium">No Terraform files generated yet</p>
        <p className="text-slate-600 text-xs mt-1">Select an architecture option to compile HCL code</p>
      </div>
    );
  }

  const handleCopy = () => {
    const code = files[activeFile] || "";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800/60 overflow-hidden shadow-2xl">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {fileNames.map((fname) => (
            <button
              key={fname}
              onClick={() => setActiveFile(fname)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeFile === fname
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileCode size={13} className="text-blue-400 shrink-0" />
              {fname}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs font-medium border border-slate-700/50 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          {onDownloadAll && (
            <button
              onClick={onDownloadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20"
            >
              <Download size={13} />
              Export ZIP
            </button>
          )}
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed custom-scrollbar selection:bg-blue-500/30">
        <pre className="whitespace-pre-wrap break-words">
          <code>{files[activeFile] || "# Empty file"}</code>
        </pre>
      </div>
    </div>
  );
}
