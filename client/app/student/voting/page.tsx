"use client";

import React, { useEffect, useState } from "react";
import { 
  LuVote, 
  LuLoader, 
  LuCheck, 
  LuLock, 
  LuUser, 
  LuCalendar, 
  LuArrowLeft, 
  LuAward,
  LuSparkles,
  LuSearch,
  LuFilter
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";
import { createClient } from "@/utils/supabase/client";

interface Option {
  id: string;
  question_id: string;
  name: string;
  details: string;
  image_url: string;
}

interface Question {
  id: string;
  poll_id: string;
  title: string;
  max_selections: number;
  options: Option[];
}

interface Poll {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_anonymous: boolean;
  status: string;
  category: "standard" | "visual" | "pageant";
  voted?: boolean;
}

export default function StudentVotingPage() {
  const [user, setUser] = useState<any>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({}); // { question_id: option_id }
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Results State
  const [viewingResultsPoll, setViewingResultsPoll] = useState<Poll | null>(null);
  const [resultsData, setResultsData] = useState<Record<string, number>>({}); // { option_id: count }
  const [resultsLoading, setResultsLoading] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const getUserAndPolls = async () => {
      setLoading(true);
      try {
        let email = "";
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          email = authUser.email;
        } else {
          const storedUser = localStorage.getItem("acetrack_user");
          if (storedUser) {
            email = JSON.parse(storedUser).email;
          }
        }

        if (!email) {
          setLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (userError || !userData) throw userError;
        setUser(userData);

        // Fetch Polls
        const { data: pollsData, error: pollsError } = await supabase
          .from("polls")
          .select("*")
          .order("created_at", { ascending: false });

        if (pollsError) throw pollsError;

        // For each poll, check if the student has voted
        const pollsWithStatus = await Promise.all(
          (pollsData || []).map(async (poll: Poll) => {
            const { data: ballotData } = await supabase
              .from("ballots")
              .select("id")
              .eq("user_id", userData.id)
              .eq("poll_id", poll.id)
              .maybeSingle();

            return {
              ...poll,
              voted: !!ballotData,
            };
          })
        );

        setPolls(pollsWithStatus);
      } catch (err) {
        console.error("Error loading voting dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    getUserAndPolls();
  }, []);

  const handleStartVote = async (poll: Poll) => {
    if (!isPollActive(poll)) {
      alert("This poll has ended or is not currently active.");
      return;
    }
    setSelectedPoll(poll);
    setLoading(true);
    try {
      // Fetch Questions
      const { data: questionsData, error: qError } = await supabase
        .from("poll_questions")
        .select("*")
        .eq("poll_id", poll.id)
        .order("order_index", { ascending: true });

      if (qError) throw qError;

      // Fetch Options for all questions
      const questionIds = (questionsData || []).map((q) => q.id);
      const { data: optionsData, error: optError } = await supabase
        .from("poll_options")
        .select("*")
        .in("question_id", questionIds);

      if (optError) throw optError;

      const formattedQuestions = (questionsData || []).map((q) => ({
        ...q,
        options: (optionsData || []).filter((o) => o.question_id === q.id),
      }));

      setQuestions(formattedQuestions);

      // Fetch existing selections for this user & poll if they have voted
      if (poll.voted && user) {
        const { data: previousVotes, error: pvError } = await supabase
          .from("votes")
          .select("question_id, option_id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id);

        if (!pvError && previousVotes) {
          const initialSelections: Record<string, string> = {};
          previousVotes.forEach((v: any) => {
            initialSelections[v.question_id] = v.option_id;
          });
          setSelections(initialSelections);
        } else {
          setSelections({});
        }
      } else {
        setSelections({});
      }
    } catch (err) {
      console.error("Error loading ballot questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelections((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitBallot = async () => {
    if (!selectedPoll || !user) return;

    if (!isPollActive(selectedPoll)) {
      alert("This poll has ended or is not currently active. Your choices cannot be submitted.");
      setSelectedPoll(null);
      return;
    }
    
    // Validate that all questions have a selection
    const unanswered = questions.filter((q) => !selections[q.id]);
    if (unanswered.length > 0) {
      alert(`Please cast your vote for all sections. Unanswered: ${unanswered.map(q => q.title).join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      // Format selections as JSONB for the RPC function
      const formattedSelections = Object.entries(selections).map(([qId, oId]) => ({
        question_id: qId,
        option_id: oId,
      }));

      const { data, error } = await supabase.rpc("cast_ballot", {
        p_poll_id: selectedPoll.id,
        p_user_id: user.id,
        p_selections: formattedSelections,
      });

      if (error) throw error;

      setSuccess(true);
      // Mark as voted in the state list
      setPolls((prev) =>
        prev.map((p) => (p.id === selectedPoll.id ? { ...p, voted: true } : p))
      );
    } catch (err: any) {
      console.error("Ballot submission error:", err);
      alert(err.message || "Failed to submit ballot. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResults = async (poll: Poll) => {
    setViewingResultsPoll(poll);
    setResultsLoading(true);
    try {
      // Fetch Questions & Options
      const { data: questionsData } = await supabase
        .from("poll_questions")
        .select("*")
        .eq("poll_id", poll.id)
        .order("order_index", { ascending: true });

      const qIds = (questionsData || []).map((q) => q.id);
      const { data: optionsData } = await supabase
        .from("poll_options")
        .select("*")
        .in("question_id", qIds);

      const formattedQuestions = (questionsData || []).map((q) => ({
        ...q,
        options: (optionsData || []).filter((o) => o.question_id === q.id),
      }));
      setQuestions(formattedQuestions);

      // Fetch Vote tallies
      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", poll.id);

      if (votesError) throw votesError;

      const counts: Record<string, number> = {};
      (votesData || []).forEach((v: any) => {
        counts[v.option_id] = (counts[v.option_id] || 0) + 1;
      });

      setResultsData(counts);
    } catch (err) {
      console.error("Error loading results:", err);
    } finally {
      setResultsLoading(false);
    }
  };

  const isPollActive = (poll: Poll) => {
    const now = new Date();
    const start = new Date(poll.start_time);
    const end = new Date(poll.end_time);
    return poll.status === "active" && now >= start && now <= end;
  };

  const activePolls = polls.filter((p) => isPollActive(p));
  const pastPolls = polls.filter((p) => !isPollActive(p) || p.status === "completed");

  if (loading && polls.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LuLoader className="size-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // Success view after voting
  if (success) {
    return (
      <div className="bg-white p-12 sm:p-24 rounded-[3rem] border border-slate-200 text-center max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
        <div className="size-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mx-auto shadow-lg shadow-emerald-50">
          <svg className="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ballot Submitted!</h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Your vote has been cast securely and anonymously. Thank you for participating in our organizational process.
          </p>
        </div>
        <div className="pt-4 flex justify-center">
          <Button 
            onClick={() => {
              setSuccess(false);
              setSelectedPoll(null);
            }}
            className="h-12 px-8 rounded-2xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Active voting ballot screen
  if (selectedPoll) {
    return (
      <div className="space-y-8 pb-12 animate-in fade-in duration-500 w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedPoll(null)}
            className="size-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all"
          >
            <LuArrowLeft className="size-5" />
          </button>
          <div>
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">Active Ballot</span>
            <h1 className="text-2xl font-black text-slate-900 leading-none">{selectedPoll.title}</h1>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex items-center justify-between border border-slate-800">
          <div className="space-y-1.5 relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-wider text-orange-300">
              <LuSparkles className="size-3" /> Anonymous Election
            </div>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              {selectedPoll.description || "Cast your vote below. Choose one candidate per position. Your choice is protected and completely anonymous."}
            </p>
          </div>
          <LuVote className="size-24 text-white/5 absolute -right-4 -bottom-4 rotate-12" />
        </div>

        {/* Ballot Questions (Positions) */}
        <div className="space-y-10">
          {questions.map((question, qIdx) => (
            <div key={question.id} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="size-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-black">
                  {qIdx + 1}
                </span>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">{question.title}</h2>
                <span className="text-xs text-slate-400 font-bold ml-auto">
                  Choose {question.max_selections} candidate
                </span>
              </div>

              {/* Conditional Card layout depending on selectedPoll.category */}
              {selectedPoll.category === "visual" ? (
                // Visual layout (e.g. T-Shirt designs): 3-column grid, larger images, hero layout
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                  {question.options.map((option) => {
                    const isSelected = selections[question.id] === option.id;
                    return (
                      <div
                        key={option.id}
                        className={`rounded-2xl sm:rounded-3xl border-2 cursor-pointer transition-all bg-white overflow-hidden flex flex-col group select-none ${
                          isSelected 
                            ? "border-orange-500 shadow-xl shadow-orange-500/5 ring-1 ring-orange-500" 
                            : "border-slate-100 hover:border-slate-300 hover:shadow-lg"
                        }`}
                      >
                        {/* Image container */}
                        <div className="relative aspect-square w-full bg-slate-100 border-b border-slate-100 overflow-hidden">
                          {option.image_url ? (
                            <>
                              <img 
                                src={option.image_url} 
                                alt={option.name} 
                                onClick={() => handleSelectOption(question.id, option.id)}
                                className="size-full object-cover transition-transform group-hover:scale-105" 
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomImage(option.image_url);
                                }}
                                className="absolute bottom-3 right-3 size-8 bg-black/60 hover:bg-black/80 rounded-xl flex items-center justify-center text-white backdrop-blur-sm transition-all scale-0 group-hover:scale-100 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <div 
                              onClick={() => handleSelectOption(question.id, option.id)}
                              className="size-full flex items-center justify-center text-slate-400 bg-slate-50"
                            >
                              <LuVote className="size-12" />
                            </div>
                          )}

                          {/* Selection checkmark overlay */}
                          <div className="absolute top-3 left-3 pointer-events-none">
                            <span className={`size-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                              isSelected 
                                ? "bg-orange-500 border-orange-500 text-white" 
                                : "bg-white/70 border-white/90 text-transparent backdrop-blur-sm"
                            }`}>
                              ✓
                            </span>
                          </div>
                        </div>

                        {/* Title details */}
                        <div 
                          onClick={() => handleSelectOption(question.id, option.id)}
                          className="p-3 sm:p-4 space-y-1 flex-1 flex flex-col justify-between"
                        >
                          <h3 className="font-black text-slate-900 text-xs sm:text-sm line-clamp-1">{option.name}</h3>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
                            {option.details || "No details provided."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedPoll.category === "pageant" ? (
                // Pageant layout: Vertical portrait cards (3:4 aspect-ratio), overlays
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                  {question.options.map((option) => {
                    const isSelected = selections[question.id] === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => handleSelectOption(question.id, option.id)}
                        className={`rounded-2xl sm:rounded-3xl border-2 cursor-pointer transition-all bg-white overflow-hidden flex flex-col group select-none relative aspect-[3/4] ${
                          isSelected 
                            ? "border-orange-500 shadow-xl shadow-orange-500/5 ring-1 ring-orange-500" 
                            : "border-slate-100 hover:border-slate-300 hover:shadow-lg"
                        }`}
                      >
                        {/* Hero Image */}
                        {option.image_url ? (
                          <img 
                            src={option.image_url} 
                            alt={option.name} 
                            className="size-full object-cover transition-transform group-hover:scale-105" 
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-slate-400 bg-slate-50">
                            <LuUser className="size-16" />
                          </div>
                        )}

                        {/* Selection checkmark */}
                        <div className="absolute top-4 left-4">
                          <span className={`size-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all ${
                            isSelected 
                              ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30" 
                              : "bg-white/80 border-slate-200 text-transparent backdrop-blur-sm"
                          }`}>
                            ✓
                          </span>
                        </div>

                        {/* Lightbox button */}
                        {option.image_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomImage(option.image_url);
                            }}
                            className="absolute top-4 right-4 size-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-all focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                            </svg>
                          </button>
                        )}

                        {/* Details overlay at bottom */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-6 text-white pt-8 sm:pt-12 flex flex-col justify-end">
                          <h3 className="font-black text-sm sm:text-lg tracking-tight leading-tight">{option.name}</h3>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-2 mt-1">
                            {option.details || "Contestant candidate."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Standard layout (Avatars)
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {question.options.map((option) => {
                    const isSelected = selections[question.id] === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => handleSelectOption(question.id, option.id)}
                        className={`p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border-2 cursor-pointer transition-all flex gap-4 items-start bg-white select-none ${
                          isSelected 
                            ? "border-orange-500 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500" 
                            : "border-slate-100 hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        <div className="size-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative group/standard">
                          {option.image_url ? (
                            <>
                              <img 
                                src={option.image_url} 
                                alt={option.name} 
                                className="size-full object-cover" 
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomImage(option.image_url);
                                }}
                                className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-2xl flex items-center justify-center text-white transition-opacity opacity-0 group-hover/standard:opacity-100 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <div className="size-full flex items-center justify-center text-slate-400 bg-slate-50">
                              <LuUser className="size-8" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 truncate">{option.name}</h3>
                            {isSelected && (
                              <span className="size-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
                            {option.details || "No platform stated."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Bar */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedPoll(null)}
            className="rounded-xl font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitBallot}
            disabled={submitting}
            className="h-12 px-8 rounded-2xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/15"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <LuLoader className="size-4 animate-spin" /> Casting Ballot...
              </span>
            ) : "Submit Ballot"}
          </Button>
        </div>
        {/* Lightbox image zoom modal */}
        {zoomImage && (
          <div 
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setZoomImage(null)}
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={zoomImage} 
              alt="Enlarged Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        )}
      </div>
    );
  }

  // Viewing Results screen
  if (viewingResultsPoll) {
    const totalVoters = Object.values(resultsData).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-8 w-full pb-12 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewingResultsPoll(null)}
            className="size-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all"
          >
            <LuArrowLeft className="size-5" />
          </button>
          <div>
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">Results</span>
            <h1 className="text-2xl font-black text-slate-900">{viewingResultsPoll.title}</h1>
          </div>
        </div>

        {resultsLoading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <LuLoader className="size-8 animate-spin text-orange-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Turnout Stats Card */}
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
              <div className="space-y-1.5 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turnout Rate</p>
                <h2 className="text-4xl font-black tracking-tight leading-none">
                  {totalVoters > 0 && polls.length > 0 ? Math.round((totalVoters / 6) * 100) : 0}%
                </h2>
                <p className="text-slate-400 text-xs font-medium">{totalVoters} out of 6 cast ballots</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl relative z-10 shrink-0">
                <LuUser className="size-6 text-orange-400" />
              </div>
            </div>

            {/* Questions tally list */}
            <div className="space-y-8">
              {questions.map((question) => {
                const totalQVotes = Object.entries(resultsData)
                  .filter(([optId]) => question.options.some((o) => o.id === optId))
                  .reduce((sum, [, count]) => sum + count, 0);

                return (
                  <div key={question.id} className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-black text-slate-800 tracking-tight">{question.title}</h2>
                      <span className="text-xs text-slate-400 font-bold">Total votes: {totalQVotes}</span>
                    </div>

                    <div className="space-y-4">
                      {question.options.map((option) => {
                        const count = resultsData[option.id] || 0;
                        const pct = totalQVotes > 0 ? Math.round((count / totalQVotes) * 100) : 0;

                        return (
                          <div key={option.id} className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-slate-700">{option.name}</span>
                              <span className="font-black text-slate-900">{count} votes ({pct}%)</span>
                            </div>
                            <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000"
                                style={{ width: `${pct}%` }}
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
          </div>
        )}
        {/* Lightbox image zoom modal */}
        {zoomImage && (
          <div 
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setZoomImage(null)}
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={zoomImage} 
              alt="Enlarged Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        )}
      </div>
    );
  }

  // Dashboard Main Grid
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Intro */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Elections & Polls</h1>
            <p className="text-slate-500 font-medium tracking-tight">Cast your ballot in active polls or browse election results.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === "active" 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Active Elections
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === "past" 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Past & Completed
        </button>
      </div>

      {/* List content */}
      {activeTab === "active" ? (
        activePolls.length === 0 ? (
          <div className="bg-white p-16 rounded-[2.5rem] border border-slate-200 text-center space-y-4">
            <div className="size-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <LuLock className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg text-slate-800">No active elections right now</h3>
              <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto">
                Check back later when the executive board schedules or initiates a new election or poll.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePolls.map((poll) => (
              <div 
                key={poll.id} 
                className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      Ongoing
                    </span>
                    {poll.is_anonymous && (
                      <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-1">
                        <LuLock className="size-2.5" /> Anonymous
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{poll.title}</h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed line-clamp-3">
                    {poll.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                    <LuCalendar className="size-4" /> End: {new Date(poll.end_time).toLocaleDateString()}
                  </div>
                  
                  {poll.voted ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                        <LuCheck className="size-3.5" /> Voted
                      </span>
                      <Button
                        onClick={() => handleStartVote(poll)}
                        variant="outline"
                        className="px-4 py-1.5 h-auto text-xs rounded-xl font-bold border-orange-200 text-orange-600 hover:bg-orange-50/30"
                      >
                        Change Vote
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleStartVote(poll)}
                      className="px-6 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Cast Ballot
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pastPolls.length === 0 ? (
          <div className="bg-white p-16 rounded-[2.5rem] border border-slate-200 text-center space-y-4">
            <div className="size-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <LuAward className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg text-slate-800">No completed elections</h3>
              <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto">
                Completed polls will appear here with charts detailing the final result data.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pastPolls.map((poll) => (
              <div 
                key={poll.id} 
                className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-slate-300 transition-all hover:shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                      Ended
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{poll.title}</h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed line-clamp-3">
                    {poll.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                    <LuCalendar className="size-4" /> Ended: {new Date(poll.end_time).toLocaleDateString()}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleViewResults(poll)}
                    className="px-6 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    View Results
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
      {/* Lightbox image zoom modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setZoomImage(null)}
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={zoomImage} 
            alt="Enlarged Preview" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
