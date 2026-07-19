"use client";

import React, { useEffect, useState } from "react";
import { 
  LuVote, 
  LuLoader, 
  LuPlus, 
  LuTrash2, 
  LuCalendar, 
  LuUsers, 
  LuChartBar, 
  LuLock, 
  LuTrash,
  LuPlay,
  LuCheck,
  LuClock,
  LuSearch
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";
import { Textarea } from "@/app/Components/ui/textarea";
import { Modal } from "@/app/Components/ui/modal";
import { createClient } from "@/utils/supabase/client";

interface Option {
  name: string;
  details: string;
  image_url: string;
}

interface QuestionForm {
  title: string;
  max_selections: number;
  options: Option[];
}

interface OptionDb {
  id: string;
  question_id: string;
  name: string;
  details: string;
  image_url: string;
}

interface QuestionDb {
  id: string;
  poll_id: string;
  title: string;
  max_selections: number;
  options: OptionDb[];
}

interface Poll {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_anonymous: boolean;
  status: "draft" | "active" | "completed";
  category: "standard" | "visual" | "pageant";
  created_at: string;
  voter_count?: number;
}

export default function AdminVotingPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [category, setCategory] = useState<"standard" | "visual" | "pageant">("standard");
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { title: "President", max_selections: 1, options: [{ name: "", details: "", image_url: "" }] }
  ]);
  const [creating, setCreating] = useState(false);

  // Stats / Results Drawer State
  const [selectedPollForResults, setSelectedPollForResults] = useState<Poll | null>(null);
  const [resultsQuestions, setResultsQuestions] = useState<QuestionDb[]>([]);
  const [resultsVotes, setResultsVotes] = useState<Record<string, number>>({});
  const [resultsLoading, setResultsLoading] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filteredPolls = polls.filter((poll) => {
    const matchesSearch = 
      poll.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poll.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poll.category?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (dateFilter) {
      const [filterYear, filterMonth] = dateFilter.split("-").map(Number);
      
      const start = new Date(poll.start_time);
      const end = new Date(poll.end_time);
      
      const startYear = start.getFullYear();
      const startMonth = start.getMonth() + 1;
      
      const endYear = end.getFullYear();
      const endMonth = end.getMonth() + 1;
      
      const pollStartsBeforeOrInMonth = startYear < filterYear || (startYear === filterYear && startMonth <= filterMonth);
      const pollEndsAfterOrInMonth = endYear > filterYear || (endYear === filterYear && endMonth >= filterMonth);
      
      return pollStartsBeforeOrInMonth && pollEndsAfterOrInMonth;
    }

    return true;
  });

  const supabase = createClient();

  const [uploadingOptions, setUploadingOptions] = useState<Record<string, boolean>>({});

  const uploadOptionImage = async (file: File, qIdx: number, oIdx: number) => {
    const key = `${qIdx}-${oIdx}`;
    setUploadingOptions((prev) => ({ ...prev, [key]: true }));
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary configuration missing. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to upload image.");
      }

      const data = await res.json();
      handleOptionChange(qIdx, oIdx, "image_url", data.secure_url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingOptions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch count of students (role = 1)
      const { data: studentsData, error: stdError } = await supabase
        .from("users")
        .select(`id, accounts:accounts!inner(role)`)
        .eq("accounts.role", 1);

      if (stdError) throw stdError;
      const studentCount = studentsData?.length || 0;
      setTotalStudents(studentCount);

      // 2. Fetch Polls
      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });

      if (pollsError) throw pollsError;

      // 3. For each poll, fetch ballot counts to compute turnout
      const pollsWithBallotCounts = await Promise.all(
        (pollsData || []).map(async (poll: Poll) => {
          const { count, error: bError } = await supabase
            .from("ballots")
            .select("*", { count: "exact", head: true })
            .eq("poll_id", poll.id);

          return {
            ...poll,
            voter_count: count || 0,
          };
        })
      );

      setPolls(pollsWithBallotCounts);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { title: "", max_selections: 1, options: [{ name: "", details: "", image_url: "" }] }
    ]);
  };

  const handleRemoveQuestion = (qIdx: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
  };

  const handleQuestionTitleChange = (qIdx: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIdx ? { ...q, title: val } : q))
    );
  };

  const handleAddOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qIdx
          ? { ...q, options: [...q.options, { name: "", details: "", image_url: "" }] }
          : q
      )
    );
  };

  const handleRemoveOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qIdx
          ? { ...q, options: q.options.filter((_, oIndex) => oIndex !== oIdx) }
          : q
      )
    );
  };

  const handleOptionChange = (qIdx: number, oIdx: number, field: keyof Option, val: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;
        const updatedOptions = q.options.map((o, oIndex) =>
          oIndex === oIdx ? { ...o, [field]: val } : o
        );
        return { ...q, options: updatedOptions };
      })
    );
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) {
      alert("Please fill in the title, start time, and end time.");
      return;
    }

    setCreating(true);
    try {
      // 1. Insert Poll
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .insert({
          title,
          description,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          is_anonymous: isAnonymous,
          category,
          status: "draft"
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const pollId = pollData.id;

      // 2. Insert questions & options sequentially
      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const qForm = questions[qIdx];
        const { data: qData, error: qError } = await supabase
          .from("poll_questions")
          .insert({
            poll_id: pollId,
            title: qForm.title,
            max_selections: qForm.max_selections,
            order_index: qIdx
          })
          .select()
          .single();

        if (qError) throw qError;

        const questionId = qData.id;

        // Insert options for this question
        const optionsToInsert = qForm.options.map((o) => ({
          question_id: questionId,
          name: o.name,
          details: o.details,
          image_url: o.image_url || null
        }));

        const { error: optError } = await supabase
          .from("poll_options")
          .insert(optionsToInsert);

        if (optError) throw optError;
      }

      // Reset state and fetch updated list
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setIsAnonymous(true);
      setCategory("standard");
      setQuestions([{ title: "President", max_selections: 1, options: [{ name: "", details: "", image_url: "" }] }]);
      setIsCreateOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Error creating poll:", err);
      alert(err.message || "Failed to create poll.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (pollId: string, newStatus: "draft" | "active" | "completed") => {
    try {
      const { error } = await supabase
        .from("polls")
        .update({ status: newStatus })
        .eq("id", pollId);

      if (error) throw error;
      await fetchDashboardData();
      if (selectedPollForResults?.id === pollId) {
        setSelectedPollForResults((prev: any) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm("Are you sure you want to delete this election/poll? This deletes all associated ballot counts and votes permanently.")) return;
    try {
      const { error } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollId);

      if (error) throw error;
      await fetchDashboardData();
    } catch (err) {
      console.error("Error deleting poll:", err);
    }
  };

  const handleOpenResults = async (poll: Poll) => {
    setSelectedPollForResults(poll);
    setResultsLoading(true);
    try {
      // 1. Fetch Questions
      const { data: questionsData } = await supabase
        .from("poll_questions")
        .select("*")
        .eq("poll_id", poll.id)
        .order("order_index", { ascending: true });

      const qIds = (questionsData || []).map((q) => q.id);

      // 2. Fetch Options
      const { data: optionsData } = await supabase
        .from("poll_options")
        .select("*")
        .in("question_id", qIds);

      const formattedQuestions = (questionsData || []).map((q) => ({
        ...q,
        options: (optionsData || []).filter((o) => o.question_id === q.id)
      }));

      setResultsQuestions(formattedQuestions);

      // 3. Fetch Votes Count grouped by option_id
      const { data: votesData } = await supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", poll.id);

      const counts: Record<string, number> = {};
      (votesData || []).forEach((v: any) => {
        counts[v.option_id] = (counts[v.option_id] || 0) + 1;
      });

      setResultsVotes(counts);
    } catch (err) {
      console.error("Error loading live results:", err);
    } finally {
      setResultsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Elections & Polling</h1>
          <p className="text-slate-500 font-medium">Create ballots, schedule votes, and track real-time results.</p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="h-12 px-6 rounded-2xl font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 shadow-xl shadow-slate-900/10"
        >
          <LuPlus className="size-5" /> Create New Poll
        </Button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <LuVote className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Total Polls</p>
            <h3 className="text-2xl font-black text-slate-900">{polls.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <LuCheck className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Active Now</p>
            <h3 className="text-2xl font-black text-slate-900">
              {polls.filter((p) => p.status === "active").length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <LuUsers className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Registered Voters</p>
            <h3 className="text-2xl font-black text-slate-900">{totalStudents}</h3>
          </div>
        </div>
      </div>

      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm shrink-0 w-full">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md group">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search polls by title or category..." 
              className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative group flex items-center gap-2">
            <input 
              type="month" 
              className="h-11 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-650 cursor-pointer"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter("")}
                className="h-9 px-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 whitespace-nowrap"
              >
                Clear Date
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            Showing {filteredPolls.length} of {polls.length} Polls
          </p>
        </div>
      </div>

      {/* Main Grid List */}
      {filteredPolls.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-12 text-center text-slate-400 font-medium border border-slate-200 shadow-sm">
          {polls.length === 0 ? "No elections or polls created yet. Click \"Create New Poll\" to get started." : "No polls match your search query."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolls.map((poll) => {
            const turnout = totalStudents > 0 ? Math.round(((poll.voter_count || 0) / totalStudents) * 100) : 0;
            return (
              <div 
                key={poll.id} 
                className="bg-white rounded-[2rem] border border-slate-200 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header with Badges */}
                <div className="p-6 pb-4 space-y-4 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                      poll.status === "active" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : poll.status === "completed"
                        ? "bg-slate-50 text-slate-500 border-slate-200" 
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}>
                      {poll.status}
                    </span>
                    
                    <div className="flex gap-1.5 items-center">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-650 border border-slate-200">
                        {poll.category}
                      </span>
                      {poll.is_anonymous && (
                        <span className="flex items-center justify-center p-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-400" title="Anonymous submission">
                          <LuLock className="size-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors leading-snug line-clamp-1">
                      {poll.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {poll.description || "No description provided."}
                    </p>
                  </div>

                  {/* Progress/Turnout */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-550">
                      <span>Voter Turnout</span>
                      <span>{poll.voter_count} / {totalStudents} ({turnout}%)</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-450 rounded-full transition-all duration-1000"
                        style={{ width: `${turnout}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer with Details & Actions */}
                <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 flex-wrap">
                    <LuCalendar className="size-3.5" />
                    <span>{new Date(poll.start_time).toLocaleDateString()} - {new Date(poll.end_time).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenResults(poll)}
                        className="rounded-xl font-bold border-slate-200 bg-white hover:bg-slate-100 flex items-center gap-2 text-slate-700 h-9"
                      >
                        <LuChartBar className="size-4 text-slate-400" /> Results
                      </Button>

                      {poll.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(poll.id, "active")}
                          className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 h-9"
                        >
                          <LuPlay className="size-4" /> Start
                        </Button>
                      )}

                      {poll.status === "active" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(poll.id, "completed")}
                          className="rounded-xl font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5 h-9"
                        >
                          <LuCheck className="size-4" /> End
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePoll(poll.id)}
                      className="size-9 p-0 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 flex items-center justify-center shrink-0"
                    >
                      <LuTrash className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE POLL MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Poll" className="max-w-2xl">
        <form onSubmit={handleCreatePollSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase">Poll Title</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Executive Board Election 2026" 
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase">Description / Instruction</label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Details about the election, platform links, or voting guidelines."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase">Poll Category / Layout Style</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="standard">Standard (Officer Elections / Profile Cards)</option>
                <option value="visual">Visual (T-Shirt Design / Posters / Large Images)</option>
                <option value="pageant">Pageant (Mr. & Ms. Intramurs / Tall Portrait Cards)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase">Start Time</label>
                <Input 
                  type="datetime-local" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase">End Time</label>
                <Input 
                  type="datetime-local" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-2">
              <input 
                type="checkbox" 
                id="is_anonymous" 
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)} 
                className="size-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="is_anonymous" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                Make submissions anonymous (Voter identity hidden from tallies)
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 tracking-tight">Positions & Candidates</h3>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddQuestion}
                className="rounded-xl font-bold h-9 text-xs border-slate-200 hover:bg-slate-50 flex items-center gap-1"
              >
                <LuPlus className="size-3.5" /> Add Position
              </Button>
            </div>

            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin">
              {questions.map((question, qIdx) => (
                <div key={qIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="size-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                      {qIdx + 1}
                    </span>
                    <Input 
                      value={question.title} 
                      onChange={(e) => handleQuestionTitleChange(qIdx, e.target.value)} 
                      placeholder="e.g. President" 
                      className="flex-1 h-9 rounded-xl font-bold border-slate-200 bg-white"
                      required
                    />
                    {questions.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      >
                        <LuTrash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 pl-9">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Candidates / Options</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => handleAddOption(qIdx)}
                        className="h-7 px-3 text-[10px] font-black text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-1"
                      >
                        <LuPlus className="size-3" /> Add Candidate
                      </Button>
                    </div>

                    {question.options.map((option, oIdx) => (
                      <div key={oIdx} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-slate-100">
                        <div className="space-y-2 flex-1 min-w-0">
                          <Input 
                            value={option.name} 
                            onChange={(e) => handleOptionChange(qIdx, oIdx, "name", e.target.value)} 
                            placeholder="Candidate Name" 
                            className="h-8 rounded-lg text-xs font-bold border-slate-100 focus:border-slate-300"
                            required
                          />
                          <Input 
                            value={option.details} 
                            onChange={(e) => handleOptionChange(qIdx, oIdx, "details", e.target.value)} 
                            placeholder="Platform Statement / Party (optional)" 
                            className="h-8 rounded-lg text-xs border-slate-100 focus:border-slate-300"
                          />
                          {/* Image upload / drag-and-drop zone */}
                          <div className="space-y-1 pt-1">
                            {option.image_url ? (
                              <div className="relative size-12 rounded-lg overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center">
                                <img 
                                  src={option.image_url} 
                                  alt="Option preview" 
                                  className="size-full object-cover" 
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOptionChange(qIdx, oIdx, "image_url", "")}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-lg"
                                >
                                  <LuTrash2 className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const file = e.dataTransfer.files?.[0];
                                  if (file && file.type.startsWith("image/")) {
                                    uploadOptionImage(file, qIdx, oIdx);
                                  }
                                }}
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = "image/*";
                                  input.onchange = (e: any) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      uploadOptionImage(file, qIdx, oIdx);
                                    }
                                  };
                                  input.click();
                                }}
                                className="h-10 rounded-lg border border-dashed border-slate-200 hover:border-orange-400 bg-slate-50 hover:bg-orange-50/20 flex items-center justify-center cursor-pointer transition-all p-1 text-center"
                              >
                                {uploadingOptions[`${qIdx}-${oIdx}`] ? (
                                  <LuLoader className="size-3.5 animate-spin text-orange-500" />
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <LuPlus className="size-3 text-slate-400" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Upload Photo
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {question.options.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveOption(qIdx, oIdx)}
                            className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-md transition-colors"
                          >
                            <LuTrash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={creating}
              className="h-12 px-6 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10"
            >
              {creating ? "Creating..." : "Save Draft"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* RESULTS DISPLAY PANEL */}
      <Modal 
        isOpen={!!selectedPollForResults} 
        onClose={() => setSelectedPollForResults(null)} 
        title={selectedPollForResults?.title || "Tally & Turnout"}
        className="max-w-2xl"
      >
        {selectedPollForResults && (
          <div className="space-y-6 py-2">
            {/* Quick Turnout Statistics */}
            <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-900 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turnout Rate</p>
                <h3 className="text-2xl font-black">
                  {totalStudents > 0 ? Math.round(((selectedPollForResults.voter_count || 0) / totalStudents) * 100) : 0}%
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  {selectedPollForResults.voter_count} out of {totalStudents} cast ballots
                </p>
              </div>
              <div className="size-10 bg-white/10 text-orange-400 rounded-xl flex items-center justify-center border border-white/5">
                <LuUsers className="size-5" />
              </div>
            </div>

            {resultsLoading ? (
              <div className="flex h-[30vh] items-center justify-center">
                <LuLoader className="size-6 animate-spin text-orange-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {resultsQuestions.map((question) => {
                  const questionOptions = question.options.map(o => o.id);
                  const totalQVotes = Object.entries(resultsVotes)
                    .filter(([optId]) => questionOptions.includes(optId))
                    .reduce((sum, [_, val]) => sum + val, 0);

                  return (
                    <div key={question.id} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="font-black text-slate-800 tracking-tight">{question.title}</h4>
                        <span className="text-xs font-bold text-slate-400">Total votes: {totalQVotes}</span>
                      </div>

                      <div className="space-y-4">
                        {question.options.map((option) => {
                          const count = resultsVotes[option.id] || 0;
                          const percent = totalQVotes > 0 ? Math.round((count / totalQVotes) * 100) : 0;

                          return (
                            <div key={option.id} className="space-y-1">
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-800">{option.name}</span>
                                <span className="text-slate-500">{count} votes ({percent}%)</span>
                              </div>
                              <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div 
                                  className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick action helper inside modal */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-2">
              {selectedPollForResults.status === "draft" && (
                <Button
                  onClick={() => handleUpdateStatus(selectedPollForResults.id, "active")}
                  className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs"
                >
                  <LuPlay className="size-4" /> Start Poll
                </Button>
              )}
              {selectedPollForResults.status === "active" && (
                <Button
                  onClick={() => handleUpdateStatus(selectedPollForResults.id, "completed")}
                  className="rounded-xl font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5 text-xs"
                >
                  <LuCheck className="size-4" /> End Poll
                </Button>
              )}
              <Button 
                onClick={() => setSelectedPollForResults(null)}
                className="rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
              >
                Close Panel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
