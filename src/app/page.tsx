"use client";

import { useMemo, useRef, useState } from "react";
import CaseForm from "@/components/CaseForm";
import PictureViewer from "@/components/PictureViewer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useLocalStorage } from "@/hooks/uselocalStorage";
import { SAPCase } from "@/types";

export default function Home() {
  const [cases, setCases] = useLocalStorage<SAPCase[]>("sap-wiki-cases", []);
  const [query, setQuery] = useState("");
  const [activeTCode, setActiveTCode] = useState<string>("all");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState<string | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingSteps, setEditingSteps] = useState("");
  const [editingScreenshots, setEditingScreenshots] = useState<string[]>([]);
  const [isEditPasted, setIsEditPasted] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "ok" | "error">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "ok" | "error">("idle");
  const [lastImportCount, setLastImportCount] = useState(0);
  const [viewer, setViewer] = useState<{ caseId: string; index: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });

  const getCaseTCodes = (wikiCase: SAPCase) => {
    if (wikiCase.tCodes && wikiCase.tCodes.length > 0) {
      return wikiCase.tCodes;
    }

    return wikiCase.tCode ? [wikiCase.tCode] : [];
  };

  const getCaseScreenshots = (wikiCase: SAPCase) => {
    if (wikiCase.screenshots && wikiCase.screenshots.length > 0) {
      return wikiCase.screenshots;
    }

    return wikiCase.screenshot ? [wikiCase.screenshot] : [];
  };

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return cases
      .filter((wikiCase) => {
        const caseTCodes = getCaseTCodes(wikiCase);

        if (activeTCode !== "all" && !caseTCodes.includes(activeTCode)) {
          return false;
        }

        if (!normalized) {
          return true;
        }

        return (
          caseTCodes.join(" ").toLowerCase().includes(normalized) ||
          wikiCase.title.toLowerCase().includes(normalized) ||
          wikiCase.requirement.toLowerCase().includes(normalized) ||
          wikiCase.steps.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [activeTCode, cases, query]);

  const tCodeFilters = useMemo(() => {
    const uniqueCodes = Array.from(new Set(cases.flatMap((wikiCase) => getCaseTCodes(wikiCase))));
    return ["all", ...uniqueCodes];
  }, [cases]);

  const newestCase = filteredCases[0];

  const handleAdd = (wikiCase: SAPCase) => {
    setCases([wikiCase, ...cases]);
    setExpandedCaseId(wikiCase.id);
  };

  const handleDelete = (caseId: string) => {
    setCases(cases.filter((wikiCase) => wikiCase.id !== caseId));
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
    }
    if (editingCaseId === caseId) {
      setEditingCaseId(null);
      setEditingSteps("");
      setEditingScreenshots([]);
      setIsEditPasted(false);
    }
  };

  const handleStartEditSolution = (wikiCase: SAPCase) => {
    setExpandedCaseId(wikiCase.id);
    setEditingCaseId(wikiCase.id);
    setEditingSteps(wikiCase.steps);
    setEditingScreenshots(getCaseScreenshots(wikiCase));
  };

  const handleCancelEditSolution = () => {
    setEditingCaseId(null);
    setEditingSteps("");
    setEditingScreenshots([]);
    setIsEditPasted(false);
  };

  const handleSaveEditSolution = (caseId: string) => {
    const nextSteps = editingSteps.trim();
    if (!nextSteps) {
      return;
    }

    setCases(
      cases.map((wikiCase) => {
        if (wikiCase.id !== caseId) {
          return wikiCase;
        }

        return {
          ...wikiCase,
          steps: nextSteps,
          screenshots: editingScreenshots,
          screenshot: editingScreenshots[0],
        };
      }),
    );

    setEditingCaseId(null);
    setEditingSteps("");
    setEditingScreenshots([]);
    setIsEditPasted(false);
  };

  const handleAddEditScreenshots = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) {
      return;
    }

    const nextImages = await Promise.all(files.map((file) => readFileAsDataURL(file)));
    setEditingScreenshots((prev) => [...prev, ...nextImages]);
    e.target.value = "";
  };

  const handlePasteEditScreenshots = async (e: React.ClipboardEvent) => {
    const imageItems = Array.from(e.clipboardData.items).filter((item) => item.type.includes("image"));
    if (imageItems.length === 0) {
      return;
    }

    e.preventDefault();
    const blobs = imageItems
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    const nextImages = await Promise.all(blobs.map((blob) => readFileAsDataURL(blob)));
    setEditingScreenshots((prev) => [...prev, ...nextImages]);
    setIsEditPasted(true);
    window.setTimeout(() => setIsEditPasted(false), 1400);
  };

  const handleRemoveEditScreenshot = (indexToRemove: number) => {
    setEditingScreenshots((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleCopyTCode = async (wikiCase: SAPCase) => {
    const caseTCodes = getCaseTCodes(wikiCase);

    try {
      await navigator.clipboard.writeText(caseTCodes.join(", "));
      setCopiedCaseId(wikiCase.id);
      window.setTimeout(() => setCopiedCaseId(null), 1200);
    } catch {
      setCopiedCaseId(null);
    }
  };

  const viewerCase = viewer ? cases.find((wikiCase) => wikiCase.id === viewer.caseId) : null;
  const viewerImages = viewerCase ? getCaseScreenshots(viewerCase) : [];
  const viewerTitle = viewerCase ? `${getCaseTCodes(viewerCase).join(", ")} • ${viewerCase.title}` : "Viewer";

  const handleOpenViewer = (caseId: string, index: number) => {
    setViewer({ caseId, index });
  };

  const handleCloseViewer = () => {
    setViewer(null);
  };

  const handleSaveMarkedCopy = (annotatedImage: string, _sourceIndex: number) => {
    if (!viewer) {
      return;
    }

    setCases(
      cases.map((wikiCase) => {
        if (wikiCase.id !== viewer.caseId) {
          return wikiCase;
        }

        const screenshots = getCaseScreenshots(wikiCase);
        const nextScreenshots = [...screenshots, annotatedImage];

        return {
          ...wikiCase,
          screenshots: nextScreenshots,
          screenshot: nextScreenshots[0],
        };
      }),
    );
  };

  const handleExportData = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        app: "sap-playbook",
        cases,
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const dateStamp = new Date().toISOString().slice(0, 10);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `sap-playbook-backup-${dateStamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setExportStatus("ok");
      setImportStatus("idle");
      window.setTimeout(() => setExportStatus("idle"), 2200);
    } catch {
      setExportStatus("error");
      setImportStatus("idle");
      window.setTimeout(() => setExportStatus("idle"), 2600);
    }
  };

  const isSAPCase = (value: unknown): value is SAPCase => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const candidate = value as Partial<SAPCase>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.requirement === "string" &&
      typeof candidate.steps === "string" &&
      typeof candidate.createdAt === "number"
    );
  };

  const normalizeImportedCase = (wikiCase: SAPCase): SAPCase => {
    const normalizedTCodes =
      wikiCase.tCodes && wikiCase.tCodes.length > 0
        ? wikiCase.tCodes
        : wikiCase.tCode
          ? [wikiCase.tCode]
          : [];

    const normalizedScreenshots =
      wikiCase.screenshots && wikiCase.screenshots.length > 0
        ? wikiCase.screenshots
        : wikiCase.screenshot
          ? [wikiCase.screenshot]
          : [];

    return {
      ...wikiCase,
      tCode: normalizedTCodes[0] ?? wikiCase.tCode,
      tCodes: normalizedTCodes,
      screenshot: normalizedScreenshots[0],
      screenshots: normalizedScreenshots,
    };
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      const parsed = JSON.parse(fileText) as unknown;

      const imported = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { cases?: unknown }).cases)
          ? (parsed as { cases: unknown[] }).cases
          : null;

      if (!imported) {
        throw new Error("Invalid backup file format.");
      }

      const validCases = imported.filter(isSAPCase).map(normalizeImportedCase);
      if (validCases.length === 0) {
        throw new Error("No valid case records found in file.");
      }

      const shouldReplace = window.confirm(
        `Import ${validCases.length} case(s)? This will replace your current local wiki data on this browser.`,
      );
      if (!shouldReplace) {
        e.target.value = "";
        return;
      }

      setCases(validCases);
      setExpandedCaseId(null);
      setEditingCaseId(null);
      setEditingSteps("");
      setEditingScreenshots([]);
      setViewer(null);

      setLastImportCount(validCases.length);
      setImportStatus("ok");
      setExportStatus("idle");
      window.setTimeout(() => setImportStatus("idle"), 2600);
    } catch {
      setImportStatus("error");
      setExportStatus("idle");
      window.setTimeout(() => setImportStatus("idle"), 2800);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="playful-bg min-h-dvh px-4 py-6 md:px-8 md:py-10">
      <main className="mx-auto w-full max-w-6xl space-y-5">
        <header className="glass-card pop-in relative overflow-hidden rounded-3xl p-6 md:p-8">
          <div className="float-slow absolute -right-8 -top-6 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-300 to-green-500 opacity-70 blur-[1px]" />
          <div className="absolute -left-6 bottom-2 h-24 w-24 rounded-full bg-gradient-to-br from-lime-300 to-emerald-500 opacity-70" />

          <div className="relative">
            <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
              LOCAL SEARCHABLE WIKI
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
              Find The Fix Fast,
              <span className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-500 bg-clip-text text-transparent">
                {" "}
                Keep The Know-How Forever
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
              Store SAP case solutions, search instantly by T-Code or keyword, and turn today&apos;s issue
              into tomorrow&apos;s shortcut.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportData}
                className="sr-only"
                aria-label="Import backup file"
              />

              <button
                type="button"
                onClick={handleExportData}
                className="h-11 rounded-xl border-2 border-emerald-300 bg-white/90 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                Export Backup
              </button>

              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="h-11 rounded-xl border-2 border-slate-300 bg-white/90 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Import Backup
              </button>

              <PWAInstallPrompt />

              <p className="text-xs text-slate-600" role="status" aria-live="polite">
                {exportStatus === "ok" && "Backup downloaded as JSON."}
                {exportStatus === "error" && "Export failed. Try again."}
                {importStatus === "ok" && `Imported ${lastImportCount} case(s) into local wiki.`}
                {importStatus === "error" && "Import failed. Use a valid backup JSON file."}
                {exportStatus === "idle" && importStatus === "idle" && "Local-only import/export. Nothing is uploaded."}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="glass-card rounded-2xl p-4">
            <p className="text-xs font-semibold tracking-wider text-slate-600">TOTAL CASES</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{cases.length}</p>
          </article>
          <article className="glass-card rounded-2xl p-4">
            <p className="text-xs font-semibold tracking-wider text-slate-600">VISIBLE NOW</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{filteredCases.length}</p>
          </article>
          <article className="glass-card rounded-2xl p-4">
            <p className="text-xs font-semibold tracking-wider text-slate-600">LATEST HOTSPOT</p>
            <p className="mt-1 truncate text-xl font-semibold text-slate-900">
              {newestCase ? getCaseTCodes(newestCase).join(", ") : "No cases yet"}
            </p>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="glass-card rounded-3xl p-4 md:p-5">
              <label htmlFor="search" className="text-sm font-semibold text-slate-700">
                Search Cases
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by T-Code, title, requirement, or steps"
                  className="h-12 flex-1 rounded-xl border-2 border-emerald-200 bg-white/90 px-3 outline-none transition focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="h-12 rounded-xl border-2 border-slate-200 bg-white/90 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {tCodeFilters.map((filterCode) => {
                  const isActive = activeTCode === filterCode;
                  return (
                    <button
                      key={filterCode}
                      type="button"
                      onClick={() => setActiveTCode(filterCode)}
                      className={`rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-emerald-200 bg-white/80 text-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      {filterCode === "all" ? "All T-Codes" : filterCode}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3">
              {filteredCases.length === 0 && (
                <article className="glass-card rounded-2xl p-6 text-sm text-slate-700">
                  No matching cases yet. Add one on the right and it will appear here instantly.
                </article>
              )}

              {filteredCases.map((wikiCase, index) => {
                const isExpanded = expandedCaseId === wikiCase.id;
                const isEditing = editingCaseId === wikiCase.id;
                const caseTCodes = getCaseTCodes(wikiCase);
                const screenshots = getCaseScreenshots(wikiCase);

                return (
                  <article
                    key={wikiCase.id}
                    className="glass-card rounded-2xl p-4"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {caseTCodes.map((code) => (
                            <span
                              key={`${wikiCase.id}-${code}`}
                              className="inline-flex rounded-full bg-gradient-to-r from-emerald-600 to-green-500 px-2 py-1 text-xs font-semibold text-white"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">{wikiCase.title}</h3>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyTCode(wikiCase)}
                          className="rounded-lg border-2 border-emerald-200 bg-white/90 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          {copiedCaseId === wikiCase.id ? "Copied" : "Copy T-Codes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(wikiCase.id)}
                          className="rounded-lg border-2 border-rose-200 bg-white/90 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">{wikiCase.requirement}</p>

                    <button
                      type="button"
                      onClick={() => setExpandedCaseId(isExpanded ? null : wikiCase.id)}
                      className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      {isExpanded ? "Hide Solution" : "Show Solution"}
                    </button>

                    {isExpanded && (
                      <div className="pop-in mt-3 space-y-3 rounded-xl border border-slate-200 bg-white/90 p-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Requirement</p>
                          <p className="text-sm text-slate-700">{wikiCase.requirement}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Resolution</p>
                          {isEditing ? (
                            <div className="mt-1 space-y-2">
                              <textarea
                                value={editingSteps}
                                onChange={(e) => setEditingSteps(e.target.value)}
                                className="min-h-28 w-full rounded-xl border-2 border-emerald-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
                                aria-label="Edit solution"
                              />
                              <div
                                className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3"
                                onPaste={handlePasteEditScreenshots}
                              >
                                <p className="text-xs font-semibold text-emerald-800">Edit Screenshots</p>
                                <p className="mt-1 text-xs text-emerald-700">
                                  Click here and press Ctrl+V to paste screenshot(s).
                                </p>
                                <label className="mt-2 inline-flex cursor-pointer rounded-lg border-2 border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                                  Add Screenshots
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleAddEditScreenshots}
                                    className="sr-only"
                                  />
                                </label>
                                <p className="mt-2 text-xs text-emerald-700" role="status" aria-live="polite">
                                  {isEditPasted ? "Screenshot pasted successfully." : "Paste or upload screenshots."}
                                </p>

                                {editingScreenshots.length > 0 ? (
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    {editingScreenshots.map((screenshot, screenshotIndex) => (
                                      <div key={`edit-${wikiCase.id}-${screenshotIndex}`} className="relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={screenshot}
                                          alt={`Editing screenshot ${screenshotIndex + 1} for ${caseTCodes.join(", ")}`}
                                          className="max-h-28 w-full rounded-lg border border-emerald-200 object-cover"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveEditScreenshot(screenshotIndex)}
                                          className="absolute right-1 top-1 rounded bg-black/65 px-2 py-1 text-[10px] font-semibold text-white"
                                          aria-label={`Remove screenshot ${screenshotIndex + 1}`}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs text-emerald-700">No screenshots attached.</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditSolution(wikiCase.id)}
                                  disabled={!editingSteps.trim()}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Save Solution
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditSolution}
                                  className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap text-sm text-slate-700">{wikiCase.steps}</p>
                              <button
                                type="button"
                                onClick={() => handleStartEditSolution(wikiCase)}
                                className="mt-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                Edit Solution
                              </button>
                            </>
                          )}
                        </div>
                        {screenshots.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold text-slate-500">
                              Screenshots ({screenshots.length})
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {screenshots.map((screenshot, screenshotIndex) => (
                                <button
                                  key={`${wikiCase.id}-shot-${screenshotIndex}`}
                                  type="button"
                                  onClick={() => handleOpenViewer(wikiCase.id, screenshotIndex)}
                                  className="group relative overflow-hidden rounded-lg border border-slate-200 text-left"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={screenshot}
                                    alt={`Screenshot ${screenshotIndex + 1} for ${caseTCodes.join(", ")}`}
                                    className="max-h-52 w-full object-cover transition group-hover:scale-[1.02]"
                                  />
                                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                                    Open
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          <CaseForm onAdd={handleAdd} />
        </section>

        <PictureViewer
          isOpen={Boolean(viewer && viewerImages.length > 0)}
          images={viewerImages}
          initialIndex={viewer?.index ?? 0}
          title={viewerTitle}
          onClose={handleCloseViewer}
          onSaveAnnotated={handleSaveMarkedCopy}
        />

        <footer className="pb-4 text-center text-xs font-semibold text-slate-600">
          Built for quick fixes, shared memory, and less repeated debugging.
        </footer>
      </main>
    </div>
  );
}
