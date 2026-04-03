"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LuFolder,
  LuFileText,
  LuUpload,
  LuPlus,
  LuFolderPlus,
  LuChevronRight,
  LuMoveVertical,
  LuTrash2,
  LuLoader,
  LuFile,
  LuExternalLink,
  LuDownload
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

export default function DocumentsPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, name: string }[]>([{ id: null, name: "Root" }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'folder' | 'file', doc?: Document, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchContents();
    if (currentFolderId) {
      buildBreadcrumbs(currentFolderId);
    } else {
      setBreadcrumbs([{ id: null, name: "Root" }]);
    }
  }, [currentFolderId]);

  const fetchContents = async () => {
    setLoading(true);

    // Fetch folders
    let folderQuery = supabase.from("document_folders").select("*").order("name", { ascending: true });
    if (currentFolderId) {
      folderQuery = folderQuery.eq("parent_folder_id", currentFolderId);
    } else {
      folderQuery = folderQuery.is("parent_folder_id", null);
    }
    const { data: folderData, error: folderError } = await folderQuery;

    // Fetch files
    let docQuery = supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (currentFolderId) {
      docQuery = docQuery.eq("folder_id", currentFolderId);
    } else {
      docQuery = docQuery.is("folder_id", null);
    }
    const { data: docData, error: docError } = await docQuery;

    if (!folderError) setFolders(folderData || []);
    if (!docError) setDocuments(docData || []);

    setLoading(false);
  };

  const buildBreadcrumbs = async (folderId: string) => {
    let currentId: string | null = folderId;
    const paths: { id: string, name: string }[] = [];

    while (currentId) {
      const { data }: { data: any } = await supabase.from("document_folders").select("id, name, parent_folder_id").eq("id", currentId).single();
      
      if (data) {
        paths.unshift({ id: data.id, name: data.name });
        currentId = data.parent_folder_id;
      } else {
        break;
      }
    }

    setBreadcrumbs([{ id: null, name: "Root" }, ...paths]);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    const { error } = await supabase
      .from("document_folders")
      .insert([{ name: newFolderName, parent_folder_id: currentFolderId }]);

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
      // 1. Upload to Cloudinary (direct from client)
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

      // 2. Save metadata to Supabase
      const { error: dbError } = await supabase
        .from("documents")
        .insert([{
          folder_id: currentFolderId,
          drive_file_id: cloudinaryData.public_id,
          name: file.name,
          file_type: file.type || "application/octet-stream",
          web_view_link: cloudinaryData.secure_url
        }]);

      if (dbError) throw dbError;

      toast.success("File uploaded perfectly!");
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

    if (type === 'folder') {
      const { error } = await supabase.from("document_folders").delete().eq("id", id);
      if (error) toast.error("Failed to delete folder.");
      else { toast.success("Folder deleted."); fetchContents(); }
    } else {
      if (doc?.drive_file_id) {
        const toastId = toast.loading("Deleting from cloud...");
        try {
           const res = await fetch('/api/cloudinary/delete', {
             method: 'POST',
             body: JSON.stringify({
               public_id: doc.drive_file_id,
               resource_type: doc.file_type.includes('image') ? 'image' : 'raw'
             }),
             headers: { 'Content-Type': 'application/json' }
           });
           if (!res.ok) {
             const data = await res.json();
             console.error("Cloudinary Delete Error:", data); // Log to console, but don't strictly prevent DB deletion if file is orphaned
           }
        } catch (err: any) {
           console.error("Cloudinary request failed:", err);
        }
        toast.dismiss(toastId);
      }

      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) toast.error("Failed to delete file record.");
      else { toast.success("File removed."); fetchContents(); }
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

      // Recursive function to fetch files and subfolders
      const fetchFolderContents = async (currentFolderId: string, currentZipFolder: any) => {
        // Fetch files in this folder
        const { data: files } = await supabase.from("documents").select("*").eq("folder_id", currentFolderId);
        
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

        // Fetch subfolders
        const { data: subfolders } = await supabase.from("document_folders").select("*").eq("parent_folder_id", currentFolderId);
        
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Documents</h1>
          <p className="text-slate-500 font-medium tracking-tight">Manage all organizational files securely in the cloud.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowAddFolder(true)}
            variant="outline"
            className="h-12 px-5 rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <LuFolderPlus className="size-5 mr-2" /> New Folder
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-12 px-6 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all"
          >
            {uploading ? <LuLoader className="size-5 mr-2 animate-spin" /> : <LuUpload className="size-5 mr-2" />}
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* New Folder Modal */}
      {showAddFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 mb-6">Create New Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <div className="space-y-3 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Folder Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Activity Proposals"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 ring-blue-50 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" onClick={() => setShowAddFolder(false)} variant="outline" className="flex-1 h-12 rounded-xl text-slate-600">Cancel</Button>
                <Button type="submit" disabled={isCreatingFolder} className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold shadow-lg">
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
              Are you sure you want to permanently delete <span className="font-bold text-slate-800">"{itemToDelete.name}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button type="button" onClick={() => setItemToDelete(null)} variant="outline" className="flex-1 h-12 rounded-xl text-slate-600">Cancel</Button>
              <Button type="button" onClick={confirmDelete} disabled={isDeleting} className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/20">
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm min-h-[60vh] flex flex-col">

        {/* Breadcrumb Path */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || 'root'}>
              <button
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`text-sm font-bold transition-colors whitespace-nowrap px-3 py-1.5 rounded-lg ${idx === breadcrumbs.length - 1 ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-200/50'}`}
              >
                {crumb.name}
              </button>
              {idx < breadcrumbs.length - 1 && <LuChevronRight className="size-4 text-slate-300 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Contents Grid */}
        <div className="p-8 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LuLoader className="size-10 text-blue-500 animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Contents...</p>
            </div>
          ) : folders.length === 0 && documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <LuFolder className="size-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">This folder is empty</h3>
              <p className="text-sm font-medium text-slate-500 max-w-sm">Upload a file or create a new folder to get started.</p>
            </div>
          ) : (
            <div className="space-y-8">

              {/* Folders Section */}
              {folders.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Folders</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {folders.map(folder => (
                      <div
                        key={folder.id}
                        className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <LuFolder className="size-6 text-blue-500 fill-blue-500/20 flex-shrink-0" />
                          <span className="text-sm font-bold text-slate-700 truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadFolder(folder); }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            title="Download Folder"
                          >
                            <LuDownload className="size-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setItemToDelete({ id: folder.id, type: 'folder', name: folder.name }); }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <LuTrash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              {documents.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {documents.map(doc => {
                      const isPdf = doc.file_type.includes('pdf');
                      const isWord = doc.file_type.includes('word') || doc.name.endsWith('.docx');

                      return (
                        <div
                          key={doc.id}
                          className="group flex flex-col p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all relative"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${isPdf ? 'bg-rose-50 text-rose-500' : isWord ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500'}`}>
                              <LuFileText className="size-6" />
                            </div>
                            <div className="flex items-center gap-1 transition-all">
                              <a
                                href={doc.web_view_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                title="Open File"
                              >
                                <LuExternalLink className="size-4" />
                              </a>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDownloadFile(doc);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                title="Download File"
                              >
                                <LuDownload className="size-4" />
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete({ id: doc.id, type: 'file', doc, name: doc.name }); }}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Record"
                              >
                                <LuTrash2 className="size-4" />
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDownloadFile(doc);
                            }}
                            className="block outline-none group/link text-left w-full mt-2"
                          >
                            <h5 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover/link:text-blue-600 transition-colors mb-2" title={doc.name}>
                              {doc.name}
                            </h5>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
