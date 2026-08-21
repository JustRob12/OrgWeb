"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LuFolder,
  LuFileText,
  LuUpload,
  LuFolderPlus,
  LuChevronRight,
  LuChevronDown,
  LuTrash2,
  LuLoader,
  LuFile,
  LuExternalLink,
  LuDownload,
  LuSearch,
  LuX,
  LuSlidersHorizontal,
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
  LuLayoutGrid,
  LuList,
  LuCalendar,
  LuFileSpreadsheet,
  LuImage,
  LuFileArchive,
  LuCheck,
  LuRotateCcw,
  LuClock
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/app/Components/ui/button";

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
}

interface Document {
  id: string;
  folder_id: string | null;
  drive_file_id: string;
  name: string;
  file_type: string;
  web_view_link: string;
  created_at: string;
}

type FileTypeFilter = "all" | "folder" | "pdf" | "doc" | "sheet" | "image" | "archive" | "other";
type DateFilter = "all" | "today" | "last7" | "last30" | "this_year";
type SortField = "name" | "date" | "type";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list";
type SearchScope = "current" | "all";

export default function DocumentsPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Drive" }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allFoldersMap, setAllFoldersMap] = useState<Record<string, Folder>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter State (Google Drive style)
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchScope, setSearchScope] = useState<SearchScope>("current");

  // Dropdown / Popover Visibility
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  // Modals
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: "folder" | "file";
    doc?: Document;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) setShowFilterMenu(false);
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) setShowSortMenu(false);
      if (typeMenuRef.current && !typeMenuRef.current.contains(target)) setShowTypeMenu(false);
      if (dateMenuRef.current && !dateMenuRef.current.contains(target)) setShowDateMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchContents();
    if (currentFolderId) {
      buildBreadcrumbs(currentFolderId);
    } else {
      setBreadcrumbs([{ id: null, name: "Drive" }]);
    }
  }, [currentFolderId, searchScope]);

  const fetchContents = async () => {
    setLoading(true);

    try {
      // Fetch all folders map to resolve parent folder names when searching globally
      const { data: allFoldersData } = await supabase.from("document_folders").select("*");
      if (allFoldersData) {
        const map: Record<string, Folder> = {};
        allFoldersData.forEach((f: Folder) => {
          map[f.id] = f;
        });
        setAllFoldersMap(map);
      }

      // Fetch folders
      let folderQuery = supabase.from("document_folders").select("*");
      if (searchScope === "current") {
        if (currentFolderId) {
          folderQuery = folderQuery.eq("parent_folder_id", currentFolderId);
        } else {
          folderQuery = folderQuery.is("parent_folder_id", null);
        }
      }
      folderQuery = folderQuery.order("name", { ascending: true });
      const { data: folderData, error: folderError } = await folderQuery;

      // Fetch files
      let docQuery = supabase.from("documents").select("*");
      if (searchScope === "current") {
        if (currentFolderId) {
          docQuery = docQuery.eq("folder_id", currentFolderId);
        } else {
          docQuery = docQuery.is("folder_id", null);
        }
      }
      docQuery = docQuery.order("created_at", { ascending: false });
      const { data: docData, error: docError } = await docQuery;

      if (!folderError) setFolders(folderData || []);
      if (!docError) setDocuments(docData || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  const buildBreadcrumbs = async (folderId: string) => {
    let currentId: string | null = folderId;
    const paths: { id: string; name: string }[] = [];

    while (currentId) {
      const { data }: { data: any } = await supabase
        .from("document_folders")
        .select("id, name, parent_folder_id")
        .eq("id", currentId)
        .single();

      if (data) {
        paths.unshift({ id: data.id, name: data.name });
        currentId = data.parent_folder_id;
      } else {
        break;
      }
    }

    setBreadcrumbs([{ id: null, name: "Drive" }, ...paths]);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    const { error } = await supabase
      .from("document_folders")
      .insert([{ name: newFolderName.trim(), parent_folder_id: currentFolderId }]);

    setIsCreatingFolder(false);

    if (error) {
      toast.error("Failed to create folder.");
    } else {
      toast.success("Folder created!");
      setShowAddFolder(false);
      setNewFolderName("");
      fetchContents();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");

    try {
      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudinaryData = await cloudinaryRes.json();

      if (!cloudinaryRes.ok) {
        throw new Error(cloudinaryData.error?.message || "Upload to Cloudinary failed");
      }

      const { error: dbError } = await supabase.from("documents").insert([
        {
          folder_id: currentFolderId,
          drive_file_id: cloudinaryData.public_id,
          name: file.name,
          file_type: file.type || "application/octet-stream",
          web_view_link: cloudinaryData.secure_url,
        },
      ]);

      if (dbError) throw dbError;

      toast.success("File uploaded successfully!");
      fetchContents();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const { id, type, doc } = itemToDelete;

    if (type === "folder") {
      const { error } = await supabase.from("document_folders").delete().eq("id", id);
      if (error) toast.error("Failed to delete folder.");
      else {
        toast.success("Folder deleted.");
        fetchContents();
      }
    } else {
      if (doc?.drive_file_id) {
        const toastId = toast.loading("Deleting from cloud...");
        try {
          const res = await fetch("/api/cloudinary/delete", {
            method: "POST",
            body: JSON.stringify({
              public_id: doc.drive_file_id,
              resource_type: doc.file_type.includes("image") ? "image" : "raw",
            }),
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) {
            const data = await res.json();
            console.error("Cloudinary Delete Error:", data);
          }
        } catch (err: any) {
          console.error("Cloudinary request failed:", err);
        }
        toast.dismiss(toastId);
      }

      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) toast.error("Failed to delete file record.");
      else {
        toast.success("File removed.");
        fetchContents();
      }
    }

    setIsDeleting(false);
    setItemToDelete(null);
  };

  const handleDownloadFolder = async (folder: Folder) => {
    const toastId = toast.loading(`Preparing download for ${folder.name}...`);

    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();

      const fetchFolderContents = async (cFolderId: string, currentZipFolder: any) => {
        const { data: files } = await supabase.from("documents").select("*").eq("folder_id", cFolderId);

        if (files && files.length > 0) {
          const filePromises = files.map(async (file) => {
            try {
              const response = await fetch(file.web_view_link);
              const blob = await response.blob();
              currentZipFolder.file(file.name, blob);
            } catch (err) {
              console.error(`Failed to fetch ${file.name}`, err);
            }
          });
          await Promise.all(filePromises);
        }

        const { data: subfolders } = await supabase
          .from("document_folders")
          .select("*")
          .eq("parent_folder_id", cFolderId);

        if (subfolders && subfolders.length > 0) {
          const subfolderPromises = subfolders.map(async (subfolder) => {
            const newZipFolder = currentZipFolder.folder(subfolder.name);
            await fetchFolderContents(subfolder.id, newZipFolder);
          });
          await Promise.all(subfolderPromises);
        }
      };

      await fetchFolderContents(folder.id, zip);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folder.name}.zip`);
      toast.success("Folder downloaded successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to download folder.");
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleDownloadFile = async (doc: Document) => {
    const toastId = toast.loading(`Downloading ${doc.name}...`);
    try {
      const { saveAs } = await import("file-saver");
      const res = await fetch(doc.web_view_link);
      if (!res.ok) throw new Error("Network response was not ok");
      const blob = await res.blob();
      saveAs(blob, doc.name);
    } catch (err) {
      toast.error("Failed to download file.");
    } finally {
      toast.dismiss(toastId);
    }
  };

  // File metadata classification (Google Drive aesthetics)
  const getFileMeta = (doc: Document) => {
    const name = doc.name.toLowerCase();
    const type = doc.file_type.toLowerCase();

    if (type.includes("pdf") || name.endsWith(".pdf")) {
      return {
        type: "pdf" as const,
        label: "PDF",
        badgeClass: "bg-rose-50 text-rose-600 border-rose-200/70",
        iconBg: "bg-rose-50 text-rose-600 border border-rose-100",
        accentColor: "text-rose-600",
        icon: LuFileText,
      };
    }
    if (
      type.includes("word") ||
      type.includes("document") ||
      name.endsWith(".docx") ||
      name.endsWith(".doc") ||
      name.endsWith(".odt")
    ) {
      return {
        type: "doc" as const,
        label: "Word",
        badgeClass: "bg-blue-50 text-blue-600 border-blue-200/70",
        iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
        accentColor: "text-blue-600",
        icon: LuFileText,
      };
    }
    if (
      type.includes("sheet") ||
      type.includes("excel") ||
      type.includes("csv") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    ) {
      return {
        type: "sheet" as const,
        label: "Spreadsheet",
        badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200/70",
        iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
        accentColor: "text-emerald-600",
        icon: LuFileSpreadsheet,
      };
    }
    if (type.includes("image") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) {
      return {
        type: "image" as const,
        label: "Image",
        badgeClass: "bg-purple-50 text-purple-600 border-purple-200/70",
        iconBg: "bg-purple-50 text-purple-600 border border-purple-100",
        accentColor: "text-purple-600",
        icon: LuImage,
      };
    }
    if (type.includes("zip") || /\.(zip|rar|7z|tar|gz)$/i.test(name)) {
      return {
        type: "archive" as const,
        label: "Archive",
        badgeClass: "bg-amber-50 text-amber-600 border-amber-200/70",
        iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
        accentColor: "text-amber-600",
        icon: LuFileArchive,
      };
    }
    return {
      type: "other" as const,
      label: "File",
      badgeClass: "bg-slate-50 text-slate-600 border-slate-200/70",
      iconBg: "bg-slate-50 text-slate-600 border border-slate-200",
      accentColor: "text-slate-600",
      icon: LuFile,
    };
  };

  // Helper date filter checker
  const checkDateFilter = (createdAt: string, filter: DateFilter) => {
    if (filter === "all") return true;
    const itemDate = new Date(createdAt);
    const now = new Date();

    if (filter === "today") {
      return itemDate.toDateString() === now.toDateString();
    }
    if (filter === "last7") {
      const diffTime = now.getTime() - itemDate.getTime();
      return diffTime <= 7 * 24 * 60 * 60 * 1000 && diffTime >= 0;
    }
    if (filter === "last30") {
      const diffTime = now.getTime() - itemDate.getTime();
      return diffTime <= 30 * 24 * 60 * 60 * 1000 && diffTime >= 0;
    }
    if (filter === "this_year") {
      return itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered & Sorted Folders and Documents
  const filteredFolders = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "folder") return [];

    let result = folders.filter((f) => {
      // Name search
      if (searchQuery.trim()) {
        const matches = f.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        if (!matches) return false;
      }
      // Date filter
      if (!checkDateFilter(f.created_at, dateFilter)) return false;
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortField === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === "date") {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [folders, searchQuery, typeFilter, dateFilter, sortField, sortOrder]);

  const filteredDocuments = useMemo(() => {
    if (typeFilter === "folder") return [];

    let result = documents.filter((doc) => {
      // Name search
      if (searchQuery.trim()) {
        const matches = doc.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        if (!matches) return false;
      }

      // Type filter
      if (typeFilter !== "all") {
        const meta = getFileMeta(doc);
        if (meta.type !== typeFilter) return false;
      }

      // Date filter
      if (!checkDateFilter(doc.created_at, dateFilter)) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortField === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === "date") {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "type") {
        const extA = a.name.split(".").pop() || "";
        const extB = b.name.split(".").pop() || "";
        return sortOrder === "asc" ? extA.localeCompare(extB) : extB.localeCompare(extA);
      }
      return 0;
    });

    return result;
  }, [documents, searchQuery, typeFilter, dateFilter, sortField, sortOrder]);

  const totalResultsCount = filteredFolders.length + filteredDocuments.length;
  const isFilteringActive =
    searchQuery.trim() !== "" || typeFilter !== "all" || dateFilter !== "all" || searchScope === "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setDateFilter("all");
    setSortField("name");
    setSortOrder("asc");
    setSearchScope("current");
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const getParentFolderName = (folderId: string | null) => {
    if (!folderId) return "Drive Root";
    return allFoldersMap[folderId]?.name || "Folder";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">
            Documents
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Secure cloud document repository with Google Drive style organization.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => setShowAddFolder(true)}
            variant="outline"
            className="flex-1 md:flex-initial h-11 px-4 rounded-2xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <LuFolderPlus className="size-4 mr-2 text-primary" /> New Folder
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 md:flex-initial h-11 px-5 rounded-2xl font-bold bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 transition-all"
          >
            {uploading ? <LuLoader className="size-4 mr-2 animate-spin" /> : <LuUpload className="size-4 mr-2" />}
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* Google Drive Style Search & Controls Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-4">
        {/* Main Search Input Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
              <LuSearch className="size-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in documents, PDFs, spreadsheets, folders..."
              className="w-full h-12 pl-11 pr-24 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
            {/* Search Box Inner Action Buttons */}
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-all"
                  title="Clear search text"
                >
                  <LuX className="size-4" />
                </button>
              )}

              {/* Advanced Filter Popover Trigger */}
              <div className="relative" ref={filterMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isFilteringActive
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Search filters"
                >
                  <LuSlidersHorizontal className="size-4" />
                  {isFilteringActive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                </button>

                {/* Filter Popover Dropdown */}
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <LuSlidersHorizontal className="size-4 text-primary" />
                        <span className="text-sm font-black text-slate-800">Filter Documents</span>
                      </div>
                      <button
                        onClick={() => setShowFilterMenu(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                      >
                        <LuX className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Search Scope */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Search Location
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSearchScope("current")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                              searchScope === "current"
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Current Folder
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchScope("all")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                              searchScope === "all"
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Entire Drive
                          </button>
                        </div>
                      </div>

                      {/* File Type Filter */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Document Type
                        </label>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value as FileTypeFilter)}
                          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                        >
                          <option value="all">All file types</option>
                          <option value="folder">Folders only</option>
                          <option value="pdf">PDF Documents</option>
                          <option value="doc">Word / Documents</option>
                          <option value="sheet">Spreadsheets (Excel/CSV)</option>
                          <option value="image">Images / Media</option>
                          <option value="archive">Zip / Archives</option>
                          <option value="other">Other files</option>
                        </select>
                      </div>

                      {/* Date Modified Filter */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Date Added
                        </label>
                        <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                        >
                          <option value="all">Any time</option>
                          <option value="today">Today</option>
                          <option value="last7">Last 7 days</option>
                          <option value="last30">Last 30 days</option>
                          <option value="this_year">This year (2026)</option>
                        </select>
                      </div>

                      {/* Sort Options */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Sort Order
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as SortField)}
                            className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                          >
                            <option value="name">Name (Alphabetical)</option>
                            <option value="date">Date Added</option>
                            <option value="type">File Type</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                          >
                            {sortOrder === "asc" ? (
                              <>
                                <LuArrowUp className="size-3.5 text-primary" /> Ascending
                              </>
                            ) : (
                              <>
                                <LuArrowDown className="size-3.5 text-primary" /> Descending
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Filter Reset Button */}
                      <div className="pt-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearAllFilters}
                          className="flex-1 h-9 rounded-xl text-xs font-bold border-slate-200 text-slate-600"
                        >
                          <LuRotateCcw className="size-3 mr-1.5" /> Reset Filters
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowFilterMenu(false)}
                          className="flex-1 h-9 rounded-xl text-xs font-bold bg-slate-900 text-white"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons & View Mode Controls */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2">
            {/* Quick Type Dropdown Button */}
            <div className="relative" ref={typeMenuRef}>
              <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className={`h-12 px-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  typeFilter !== "all"
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>
                  Type:{" "}
                  <span className="capitalize font-black">
                    {typeFilter === "all"
                      ? "All"
                      : typeFilter === "doc"
                      ? "Word"
                      : typeFilter === "sheet"
                      ? "Spreadsheets"
                      : typeFilter}
                  </span>
                </span>
                <LuChevronDown className="size-3.5 opacity-60" />
              </button>

              {showTypeMenu && (
                <div className="absolute left-0 lg:right-0 lg:left-auto mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Filter by Type
                  </div>
                  {[
                    { id: "all", label: "All Types" },
                    { id: "folder", label: "Folders" },
                    { id: "pdf", label: "PDF Documents" },
                    { id: "doc", label: "Word Documents" },
                    { id: "sheet", label: "Spreadsheets" },
                    { id: "image", label: "Images" },
                    { id: "archive", label: "Archives (Zip)" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTypeFilter(t.id as FileTypeFilter);
                        setShowTypeMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        typeFilter === t.id ? "text-primary bg-primary/5" : "text-slate-700"
                      }`}
                    >
                      {t.label}
                      {typeFilter === t.id && <LuCheck className="size-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Date Dropdown Button */}
            <div className="relative" ref={dateMenuRef}>
              <button
                onClick={() => setShowDateMenu(!showDateMenu)}
                className={`h-12 px-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  dateFilter !== "all"
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <LuCalendar className="size-3.5 text-slate-400" />
                <span>
                  Date:{" "}
                  <span className="capitalize font-black">
                    {dateFilter === "all"
                      ? "Any"
                      : dateFilter === "today"
                      ? "Today"
                      : dateFilter === "last7"
                      ? "7 Days"
                      : dateFilter === "last30"
                      ? "30 Days"
                      : "2026"}
                  </span>
                </span>
                <LuChevronDown className="size-3.5 opacity-60" />
              </button>

              {showDateMenu && (
                <div className="absolute left-0 lg:right-0 lg:left-auto mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Filter by Date
                  </div>
                  {[
                    { id: "all", label: "Any time" },
                    { id: "today", label: "Today" },
                    { id: "last7", label: "Last 7 days" },
                    { id: "last30", label: "Last 30 days" },
                    { id: "this_year", label: "This year" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDateFilter(d.id as DateFilter);
                        setShowDateMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        dateFilter === d.id ? "text-primary bg-primary/5" : "text-slate-700"
                      }`}
                    >
                      {d.label}
                      {dateFilter === d.id && <LuCheck className="size-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Alphabetical / Date Sort Dropdown */}
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="h-12 px-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-700 flex items-center gap-2 transition-all"
              >
                <LuArrowUpDown className="size-3.5 text-slate-400" />
                <span>
                  Sort:{" "}
                  <span className="font-black">
                    {sortField === "name"
                      ? `Name (${sortOrder === "asc" ? "A-Z" : "Z-A"})`
                      : sortField === "date"
                      ? `Date (${sortOrder === "asc" ? "Oldest" : "Newest"})`
                      : "Type"}
                  </span>
                </span>
                <LuChevronDown className="size-3.5 opacity-60" />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Sort Alphabetically & By Date
                  </div>
                  <button
                    onClick={() => {
                      setSortField("name");
                      setSortOrder("asc");
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between hover:bg-slate-50 ${
                      sortField === "name" && sortOrder === "asc" ? "text-primary bg-primary/5" : "text-slate-700"
                    }`}
                  >
                    <span>Name (A to Z)</span>
                    {sortField === "name" && sortOrder === "asc" && <LuCheck className="size-3.5 text-primary" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortField("name");
                      setSortOrder("desc");
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between hover:bg-slate-50 ${
                      sortField === "name" && sortOrder === "desc" ? "text-primary bg-primary/5" : "text-slate-700"
                    }`}
                  >
                    <span>Name (Z to A)</span>
                    {sortField === "name" && sortOrder === "desc" && <LuCheck className="size-3.5 text-primary" />}
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setSortField("date");
                      setSortOrder("desc");
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between hover:bg-slate-50 ${
                      sortField === "date" && sortOrder === "desc" ? "text-primary bg-primary/5" : "text-slate-700"
                    }`}
                  >
                    <span>Date Added (Newest First)</span>
                    {sortField === "date" && sortOrder === "desc" && <LuCheck className="size-3.5 text-primary" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortField("date");
                      setSortOrder("asc");
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between hover:bg-slate-50 ${
                      sortField === "date" && sortOrder === "asc" ? "text-primary bg-primary/5" : "text-slate-700"
                    }`}
                  >
                    <span>Date Added (Oldest First)</span>
                    {sortField === "date" && sortOrder === "asc" && <LuCheck className="size-3.5 text-primary" />}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Ascending/Descending Toggle Button */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-all"
              title={sortOrder === "asc" ? "Sort Ascending (Click for Descending)" : "Sort Descending (Click for Ascending)"}
            >
              {sortOrder === "asc" ? <LuArrowUp className="size-4 text-primary" /> : <LuArrowDown className="size-4 text-primary" />}
            </button>

            {/* View Mode Switcher (Grid vs List) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-xl transition-all ${
                  viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
                title="Grid view"
              >
                <LuLayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded-xl transition-all ${
                  viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
                title="List view"
              >
                <LuList className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges & Search Summary */}
        {isFilteringActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">Active:</span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold">
                  <LuSearch className="size-3" />
                  &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery("")} className="hover:text-rose-500">
                    <LuX className="size-3" />
                  </button>
                </span>
              )}

              {searchScope === "all" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                  Entire Drive
                  <button onClick={() => setSearchScope("current")} className="hover:text-rose-500">
                    <LuX className="size-3" />
                  </button>
                </span>
              )}

              {typeFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold capitalize">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter("all")} className="hover:text-rose-500">
                    <LuX className="size-3" />
                  </button>
                </span>
              )}

              {dateFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                  <LuCalendar className="size-3" />
                  {dateFilter === "today"
                    ? "Today"
                    : dateFilter === "last7"
                    ? "Last 7 days"
                    : dateFilter === "last30"
                    ? "Last 30 days"
                    : "This year"}
                  <button onClick={() => setDateFilter("all")} className="hover:text-rose-500">
                    <LuX className="size-3" />
                  </button>
                </span>
              )}

              <span className="text-xs font-semibold text-slate-400 ml-1">
                ({totalResultsCount} {totalResultsCount === 1 ? "item" : "items"} found)
              </span>
            </div>

            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 hover:underline ml-auto"
            >
              <LuRotateCcw className="size-3" /> Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showAddFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 mb-6">Create New Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <div className="space-y-3 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Activity Proposals"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-4 ring-primary/10 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowAddFolder(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold shadow-lg"
                >
                  {isCreatingFolder ? "Creating..." : "Create Folder"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6">
              <LuTrash2 className="size-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete {itemToDelete.type}?</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 max-w-xs mx-auto">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-slate-800">&quot;{itemToDelete.name}&quot;</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                variant="outline"
                className="flex-1 h-12 rounded-xl text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/20"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm min-h-[60vh] flex flex-col">
        {/* Breadcrumb Path & Current View Banner */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1">
            {searchScope === "all" ? (
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 flex items-center gap-1.5">
                <LuSearch className="size-3.5" /> All Drive Items
              </span>
            ) : (
              breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id || "root"}>
                  <button
                    onClick={() => {
                      setCurrentFolderId(crumb.id);
                      setSearchScope("current");
                    }}
                    className={`text-xs sm:text-sm font-bold transition-all whitespace-nowrap px-3 py-1.5 rounded-xl ${
                      idx === breadcrumbs.length - 1
                        ? "bg-primary/10 text-primary shadow-xs"
                        : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
                    }`}
                  >
                    {crumb.name}
                  </button>
                  {idx < breadcrumbs.length - 1 && (
                    <LuChevronRight className="size-4 text-slate-300 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))
            )}
          </div>

          <div className="text-xs font-bold text-slate-400">
            {totalResultsCount} {totalResultsCount === 1 ? "item" : "items"}
          </div>
        </div>

        {/* Contents Container */}
        <div className="p-6 sm:p-8 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <LuLoader className="size-10 text-primary animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Fetching Cloud Documents...
              </p>
            </div>
          ) : totalResultsCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                {isFilteringActive ? (
                  <LuSearch className="size-10 text-slate-300" />
                ) : (
                  <LuFolder className="size-10 text-slate-300" />
                )}
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                {isFilteringActive ? "No matching documents found" : "This folder is empty"}
              </h3>
              <p className="text-sm font-medium text-slate-500 max-w-sm mb-6">
                {isFilteringActive
                  ? "Try checking for spelling errors, clearing filters, or switching to search the entire drive."
                  : "Upload a file or create a new folder to organize your organization's files."}
              </p>
              {isFilteringActive ? (
                <Button onClick={clearAllFilters} variant="outline" className="rounded-xl font-bold">
                  <LuRotateCcw className="size-4 mr-2" /> Reset All Filters
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowAddFolder(true)}
                    variant="outline"
                    className="rounded-xl font-bold border-slate-200"
                  >
                    <LuFolderPlus className="size-4 mr-2 text-primary" /> New Folder
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl font-bold bg-primary text-white"
                  >
                    <LuUpload className="size-4 mr-2" /> Upload File
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* ================= GRID VIEW ================= */
            <div className="space-y-8">
              {/* Folders Section */}
              {filteredFolders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <LuFolder className="size-4 text-primary" /> Folders ({filteredFolders.length})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="group flex items-center justify-between p-4 bg-white border border-slate-200/90 rounded-2xl hover:border-primary/50 hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                        onClick={() => {
                          setCurrentFolderId(folder.id);
                          setSearchScope("current");
                        }}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                            <LuFolder className="size-5 fill-amber-400/30 text-amber-600" />
                          </div>
                          <div className="truncate">
                            <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors truncate block">
                              {folder.name}
                            </span>
                            {searchScope === "all" && (
                              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                                in {getParentFolderName(folder.parent_folder_id)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFolder(folder);
                            }}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                            title="Download Folder (ZIP)"
                          >
                            <LuDownload className="size-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete({ id: folder.id, type: "folder", name: folder.name });
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Folder"
                          >
                            <LuTrash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {filteredDocuments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <LuFile className="size-4 text-slate-500" /> Files ({filteredDocuments.length})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredDocuments.map((doc) => {
                      const meta = getFileMeta(doc);
                      const IconComponent = meta.icon;

                      return (
                        <div
                          key={doc.id}
                          className="group flex flex-col justify-between p-5 bg-white border border-slate-200/90 rounded-2xl hover:border-slate-300 hover:shadow-lg transition-all relative hover:-translate-y-0.5"
                        >
                          <div>
                            {/* Card Top Icon & Actions */}
                            <div className="flex items-start justify-between mb-4">
                              <div className={`p-3 rounded-2xl ${meta.iconBg}`}>
                                <IconComponent className="size-6" />
                              </div>

                              <div className="flex items-center gap-1">
                                <a
                                  href={doc.web_view_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                  title="Open in new tab"
                                >
                                  <LuExternalLink className="size-4" />
                                </a>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDownloadFile(doc);
                                  }}
                                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                  title="Download File"
                                >
                                  <LuDownload className="size-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setItemToDelete({ id: doc.id, type: "file", doc, name: doc.name });
                                  }}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Delete File"
                                >
                                  <LuTrash2 className="size-4" />
                                </button>
                              </div>
                            </div>

                            {/* File Name & Link */}
                            <a
                              href={doc.web_view_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block outline-none group/link text-left w-full"
                            >
                              <h5
                                className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover/link:text-primary transition-colors mb-2"
                                title={doc.name}
                              >
                                {doc.name}
                              </h5>
                            </a>
                          </div>

                          {/* Card Footer Metadata */}
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                              <LuClock className="size-3" />
                              {new Date(doc.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= LIST VIEW (Google Drive Table) ================= */
            <div className="overflow-x-auto border border-slate-200/90 rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => {
                        if (sortField === "name") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("name");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Name</span>
                        {sortField === "name" && (
                          <span className="text-primary">
                            {sortOrder === "asc" ? <LuArrowUp className="size-3" /> : <LuArrowDown className="size-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Location</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Type</th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => {
                        if (sortField === "date") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("date");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date Added</span>
                        {sortField === "date" && (
                          <span className="text-primary">
                            {sortOrder === "asc" ? <LuArrowUp className="size-3" /> : <LuArrowDown className="size-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {/* Folders in List */}
                  {filteredFolders.map((folder) => (
                    <tr
                      key={folder.id}
                      onClick={() => {
                        setCurrentFolderId(folder.id);
                        setSearchScope("current");
                      }}
                      className="group hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
                            <LuFolder className="size-4 fill-amber-400/30 text-amber-600" />
                          </div>
                          <span className="truncate group-hover:text-primary transition-colors max-w-xs sm:max-w-md">
                            {folder.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell text-xs font-semibold text-slate-400">
                        {getParentFolderName(folder.parent_folder_id)}
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                          Folder
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-500">
                        {new Date(folder.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDownloadFolder(folder)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                            title="Download Folder (ZIP)"
                          >
                            <LuDownload className="size-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ id: folder.id, type: "folder", name: folder.name })}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Folder"
                          >
                            <LuTrash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Documents in List */}
                  {filteredDocuments.map((doc) => {
                    const meta = getFileMeta(doc);
                    const IconComponent = meta.icon;

                    return (
                      <tr key={doc.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${meta.iconBg} flex-shrink-0`}>
                              <IconComponent className="size-4" />
                            </div>
                            <a
                              href={doc.web_view_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate group-hover:text-primary transition-colors max-w-xs sm:max-w-md block"
                              title={doc.name}
                            >
                              {doc.name}
                            </a>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell text-xs font-semibold text-slate-400">
                          {getParentFolderName(doc.folder_id)}
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-500">
                          {new Date(doc.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={doc.web_view_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                              title="Open in new tab"
                            >
                              <LuExternalLink className="size-4" />
                            </a>
                            <button
                              onClick={() => handleDownloadFile(doc)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                              title="Download File"
                            >
                              <LuDownload className="size-4" />
                            </button>
                            <button
                              onClick={() => setItemToDelete({ id: doc.id, type: "file", doc, name: doc.name })}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete File"
                            >
                              <LuTrash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
