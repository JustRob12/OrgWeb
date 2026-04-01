"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { LuUpload, LuSave, LuX, LuCircleCheck, LuUsers, LuCircleAlert, LuUserPlus, LuPlus } from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { Input } from "@/app/Components/ui/input";
import { Label } from "@/app/Components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/app/Components/ui/modal";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";

interface RawMemberData {
  student_id: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  course?: string;
  section?: string;
  year?: string;
  email: string;
  membership_status: "Partial" | "Fully Paid" | "Not Paid";
  payment: number;
}

export default function AddMembersPage() {
  const [members, setMembers] = useState<RawMemberData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [manualMember, setManualMember] = useState<RawMemberData>({
    student_id: "",
    first_name: "",
    middle_initial: "",
    last_name: "",
    course: "",
    section: "",
    year: "",
    email: "",
    membership_status: "Not Paid",
    payment: 0
  });
  const supabase = createClient();

  const processFile = (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Map excel columns to our interface
        const validatedData: RawMemberData[] = data.map((row) => ({
          student_id: String(row.student_id || row["Student ID"] || ""),
          first_name: row.first_name || row["First Name"] || "",
          middle_initial: row.middle_initial || row["Middle Initial"] || "",
          last_name: row.last_name || row["Last Name"] || "",
          course: row.course || row["Course"] || "",
          section: row.section || row["Section"] || "",
          year: row.year || row["Year"] || "",
          email: row.email || row["Email"] || "",
          membership_status: (row.membership_status || row["Membership Status"] || "Not Paid") as any,
          payment: Number(row.payment || row["Payment"] || row["Amount"] || 0),
        }));

        setMembers(validatedData);
        toast.success(`Successfully parsed ${validatedData.length} members.`);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse file. Please ensure it follows the correct format.");
      } finally {
        setIsUploading(false);
        setIsDragging(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!manualMember.student_id || !manualMember.first_name || !manualMember.last_name || !manualMember.email) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setMembers(prev => [...prev, manualMember]);
    setIsManualModalOpen(false);

    // Reset form
    setManualMember({
      student_id: "",
      first_name: "",
      middle_initial: "",
      last_name: "",
      course: "",
      section: "",
      year: "",
      email: "",
      membership_status: "Not Paid",
      payment: 0
    });

    toast.success("Member added to preview list.");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const generatePassword = (firstName: string, lastName: string) => {
    const first2 = firstName.substring(0, 2).toLowerCase();
    const last2 = lastName.substring(lastName.length - 2).toLowerCase();
    const random5 = Math.random().toString(36).substring(2, 7);
    return `${first2}${last2}${random5}2026`;
  };

  const saveMembers = async () => {
    if (members.length === 0) return;

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const member of members) {
      try {
        // 1. Create/Update User
        const { data: userData, error: userError } = await supabase
          .from("users")
          .upsert({
            student_id: member.student_id,
            first_name: member.first_name,
            middle_initial: member.middle_initial,
            last_name: member.last_name,
            email: member.email,
            course: member.course,
            section: member.section,
            year: member.year,
          }, { onConflict: 'student_id' })
          .select()
          .single();

        if (userError) throw userError;

        // 2. Create/Update Account (Passwords are automatically hashed by DB Trigger)
        const { error: accountError } = await supabase
          .from("accounts")
          .upsert({
            user_id: userData.id,
            username: member.email,
            password: 'pending_initial_setup', // Temporary placeholder, will be reset on Send
            role: 1, // Student
          }, { onConflict: 'username' });

        if (accountError) throw accountError;

        // 3. Create/Update Membership
        const { error: membershipError } = await supabase
          .from("memberships")
          .upsert({
            user_id: userData.id,
            status: member.membership_status,
            payment: member.payment,
          }, { onConflict: 'user_id' });

        if (membershipError) throw membershipError;

        successCount++;
      } catch (error: any) {
        console.error("Error saving member:", member.email, error.message || error, error.details || "");
        errorCount++;
      }
    }

    setIsSaving(true); // Should be false, wait
    setIsSaving(false);
    if (errorCount === 0) {
      toast.success(`Successfully saved all ${successCount} members!`);
      setMembers([]); // Clear the list after saving
    } else {
      toast.warning(`Saved ${successCount} members. Failed to save ${errorCount} members.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Add New Members</h1>
          <p className="text-slate-500 mt-1">Upload Excel/CSV files to bulk-create student accounts.</p>
        </div>

        {members.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="rounded-lg h-9"
            >
              <LuPlus className="size-3.5" /> Manually Add
            </Button>
            {members.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearModalOpen(true)}
                  className="rounded-lg h-9 hover:bg-slate-50"
                >
                  <LuX className="size-3.5" /> Clear List
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsSaveModalOpen(true)}
                  loading={isSaving}
                  className="rounded-lg h-9 bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  <LuSave className="size-3.5" /> Save to Database
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={() => {
          setIsSaveModalOpen(false);
          saveMembers();
        }}
        title="Save Members"
        description={`You are about to save ${members.length} members to the database. This will create user accounts and membership records for all of them.`}
        confirmText="Save All Members"
        variant="success"
        isLoading={isSaving}
      />

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          setMembers([]);
          setIsClearModalOpen(false);
          toast.success("Preview list cleared.");
        }}
        title="Clear List"
        description="Are you sure you want to clear the entire preview list? All unsaved data will be lost."
        confirmText="Clear List"
        variant="danger"
      />

      {!members.length && (
        <div className="flex justify-end mb-6">
          <Button
            variant="outline"
            className="rounded-2xl border-slate-200 h-11 px-6 font-semibold items-center gap-2 shadow-sm text-slate-600 hover:bg-white hover:text-slate-600 cursor-pointer"
            onClick={() => setIsManualModalOpen(true)}
          >
            <LuUserPlus className="size-4.5 text-primary/70" />
            <span>Add member manually</span>
          </Button>
        </div>
      )}

      {members.length === 0 ? (
        <Card
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed transition-all duration-300 group rounded-[2.5rem] ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01] shadow-2xl shadow-primary/10"
            : "border-slate-200 bg-slate-50/50 hover:border-primary/50"
            }`}
        >
          <CardContent className="p-12 text-center py-24">
            <div className={`mx-auto w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 transition-all duration-500 ${isDragging ? "scale-110 rotate-12 shadow-primary/20" : "shadow-slate-200/50 group-hover:scale-110"
              }`}>
              <LuUpload className={`size-10 transition-colors ${isDragging ? "text-primary" : "text-primary/60 group-hover:text-primary"}`} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {isDragging ? "Drop your file here" : "Upload Members List"}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">
              Drop your .xlsx, .xls, or .csv file here. Make sure it has a <strong>Student ID</strong> column.
            </p>
            <div className="relative inline-block">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button disabled={isUploading} className="h-12 px-8 rounded-xl font-bold gradient-primary shadow-xl shadow-primary/10">
                {isUploading ? "Processing..." : "Select File"}
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-2"><LuCircleCheck /> Unique Student IDs</span>
              <span className="flex items-center gap-2"><LuCircleCheck /> Bulk Account Creation</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card className="overflow-hidden border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Student ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Course & Year</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{member.student_id}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{member.first_name} {member.last_name}</div>
                        <div className="text-xs text-slate-400 font-medium">MI: {member.middle_initial || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium">{member.course} - {member.year}</div>
                        <div className="text-xs text-slate-400 font-medium">Sec: {member.section}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-medium">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${member.membership_status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          member.membership_status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                          {member.membership_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">₱{member.payment.toLocaleString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-start gap-3">
            <LuCircleAlert className="text-primary size-5 mt-0.5 shrink-0" />
            <p className="text-sm text-primary/80 font-medium">
              Review the data carefully. Records will be matched by <strong>Student ID</strong>. Existing records will be updated.
            </p>
          </div>
        </div>
      )}

      {/* Manual Add Member Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Add Specific Member"
      >
        <form onSubmit={handleManualAdd} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Student ID *</Label>
              <Input
                placeholder="2024-0001"
                value={manualMember.student_id}
                onChange={(e) => setManualMember({ ...manualMember, student_id: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">First Name *</Label>
              <Input
                placeholder="John"
                value={manualMember.first_name}
                onChange={(e) => setManualMember({ ...manualMember, first_name: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Last Name *</Label>
              <Input
                placeholder="Doe"
                value={manualMember.last_name}
                onChange={(e) => setManualMember({ ...manualMember, last_name: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Course *</Label>
              <Input
                placeholder="BSIT"
                value={manualMember.course}
                onChange={(e) => setManualMember({ ...manualMember, course: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Year Level</Label>
              <Input
                placeholder="1, 2, 3 or 4"
                value={manualMember.year}
                onChange={(e) => setManualMember({ ...manualMember, year: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address *</Label>
              <Input
                type="email"
                placeholder="student@school.edu.ph"
                value={manualMember.email}
                onChange={(e) => setManualMember({ ...manualMember, email: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
              <select
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                value={manualMember.membership_status}
                onChange={(e) => setManualMember({ ...manualMember, membership_status: e.target.value as any })}
              >
                <option value="Not Paid">Not Paid</option>
                <option value="Partial">Partial</option>
                <option value="Fully Paid">Fully Paid</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment (₱)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={manualMember.payment || ""}
                onChange={(e) => setManualMember({ ...manualMember, payment: Number(e.target.value) })}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl font-bold"
              onClick={() => setIsManualModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 rounded-xl font-bold gradient-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              Add to Preview
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
