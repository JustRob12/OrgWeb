"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  LuChevronLeft, 
  LuLoader, 
  LuTrophy, 
  LuUsers, 
  LuUser,
  LuVote
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface Poll {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_anonymous: boolean;
  status: "draft" | "active" | "completed";
  category: "standard" | "visual" | "pageant";
  voter_count?: number;
}

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

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pollId = searchParams.get("id");

  const [poll, setPoll] = useState<Poll | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [votesData, setVotesData] = useState<Record<string, number>>({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    const fetchResults = async () => {
      try {
        setLoading(true);
        if (!pollId) {
          throw new Error("No poll ID provided.");
        }

        // 1. Fetch Poll
        const { data: pollData, error: pollErr } = await supabase
          .from("polls")
          .select("*")
          .eq("id", pollId)
          .single();
        if (pollErr || !pollData) throw new Error("Could not find this election/poll.");
        if (isMounted) setPoll(pollData);

        // 2. Fetch Questions
        const { data: questionsData, error: qErr } = await supabase
          .from("poll_questions")
          .select("*")
          .eq("poll_id", pollId)
          .order("order_index", { ascending: true });
        if (qErr) throw qErr;

        const qIds = (questionsData || []).map((q) => q.id);

        if (qIds.length > 0) {
          // 3. Fetch Options
          const { data: optionsData, error: oErr } = await supabase
            .from("poll_options")
            .select("*")
            .in("question_id", qIds);
          if (oErr) throw oErr;

          const formattedQuestions = (questionsData || []).map((q) => ({
            ...q,
            options: (optionsData || []).filter((o) => o.question_id === q.id)
          }));
          if (isMounted) setQuestions(formattedQuestions);

          // 4. Fetch Votes Tally
          const { data: votesDataList, error: vErr } = await supabase
            .from("votes")
            .select("option_id")
            .eq("poll_id", pollId);
          if (vErr) throw vErr;

          const counts: Record<string, number> = {};
          ((votesDataList || []) as Array<{ option_id: string }>).forEach((v) => {
            counts[v.option_id] = (counts[v.option_id] || 0) + 1;
          });
          if (isMounted) setVotesData(counts);
        }

        // 5. Fetch Total Students for Turnout Rate
        const { count: studentCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "student");
        if (isMounted) setTotalStudents(studentCount || 0);

      } catch (err: unknown) {
        console.error(err);
        const errMsg = err instanceof Error ? err.message : "An error occurred while loading results.";
        if (isMounted) setError(errMsg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResults();
    return () => {
      isMounted = false;
    };
  }, [pollId, supabase]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
        <LuLoader className="size-10 animate-spin text-orange-600" />
        <p className="text-sm text-slate-500 font-bold">Loading election results...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border border-slate-200 rounded-[2rem] p-8 text-center space-y-4 shadow-sm">
        <p className="text-rose-600 font-black text-lg">Error Loading Results</p>
        <p className="text-slate-500 text-sm font-medium">{error || "Election data could not be retrieved."}</p>
        <Button 
          onClick={() => router.push("/student/voting")}
          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6"
        >
          Back to Elections
        </Button>
      </div>
    );
  }

  const castVoters = poll.voter_count || 0;
  const turnoutPercent = totalStudents > 0 ? Math.round((castVoters / totalStudents) * 100) : 0;
  const isPastDeadline = Boolean(poll.end_time) && new Date() > new Date(poll.end_time);
  const isPollEnded = poll.status === "completed" || isPastDeadline;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      {/* Header and Back navigation */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push("/student/voting")}
          className="size-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all shadow-sm cursor-pointer"
        >
          <LuChevronLeft className="size-5" />
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">Election Results</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isPollEnded 
                ? "bg-slate-100 border-slate-300 text-slate-700 font-bold" 
                : "bg-emerald-50 border-emerald-200 text-emerald-600 font-bold"
            }`}>
              {isPollEnded ? "Voting Ended" : "Voting in Progress"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-500">
              Turnout: {turnoutPercent}% ({castVoters}/{totalStudents})
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">{poll.title}</h1>
        </div>
      </div>

      {/* Dynamic Status Alert Banner */}
      {!isPollEnded ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 shadow-xs">
          <div className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          <p className="text-xs font-medium leading-relaxed">
            <strong className="font-bold">Voting is currently active:</strong> Showing real-time vote tallies for all candidates. The official <strong>Winner</strong> will be announced once voting concludes on {poll.end_time ? new Date(poll.end_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "the deadline"}.
          </p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs">
          <LuTrophy className="size-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">
            <strong className="font-bold">Voting has officially concluded:</strong> Final tally results and official winners are displayed below.
          </p>
        </div>
      )}

      {/* Winner Tally / Live Count Section */}
      <div className="space-y-12">
        {questions.map((question) => {
          const totalQVotes = Object.entries(votesData)
            .filter(([optId]) => question.options.some((o) => o.id === optId))
            .reduce((sum, [, count]) => sum + count, 0);

          // Sort options by vote count (highest first)
          const sortedOptions = [...question.options].sort((a, b) => {
            const votesA = votesData[a.id] || 0;
            const votesB = votesData[b.id] || 0;
            return votesB - votesA;
          });

          const maxVotes = sortedOptions.length > 0 ? (votesData[sortedOptions[0].id] || 0) : 0;
          const hasVotes = maxVotes > 0;

          // Determine winners (handles ties)
          const winners = hasVotes ? sortedOptions.filter((o) => (votesData[o.id] || 0) === maxVotes) : [];
          const runnersUp = hasVotes ? sortedOptions.filter((o) => (votesData[o.id] || 0) < maxVotes) : sortedOptions;

          return (
            <div key={question.id} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{question.title}</h2>
                <span className="text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-150">
                  Total votes cast for this position: {totalQVotes}
                </span>
              </div>

              {/* Case 1: Poll has ended -> Display Winner on Top, then Other Candidates */}
              {isPollEnded ? (
                <div className="space-y-8">
                  {/* 1. Winner Display at the Top (Big Card) */}
                  {hasVotes ? (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                        <LuTrophy className="size-4 animate-bounce" /> {winners.length > 1 ? "Tied Winners" : "Official Winner"}
                      </h3>
                      <div className="flex flex-wrap gap-6">
                        {winners.map((winner) => {
                          const count = votesData[winner.id] || 0;
                          const pct = totalQVotes > 0 ? Math.round((count / totalQVotes) * 100) : 0;
                          return (
                            <div 
                              key={winner.id}
                              className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-orange-50/20 border-2 border-amber-300 rounded-[2rem] shadow-md flex flex-col group transition-all duration-300 hover:shadow-xl hover:border-amber-400 max-w-xs sm:max-w-sm w-full"
                            >
                              {/* Trophy overlay */}
                              <div className="absolute top-4 right-4 bg-amber-500 text-white size-10 rounded-full flex items-center justify-center shadow-lg font-bold text-base z-10 animate-bounce">
                                🏆
                              </div>

                              {/* Profile image container */}
                              <div className="relative aspect-square w-full bg-white border-b border-amber-100 overflow-hidden flex items-center justify-center">
                                {winner.image_url ? (
                                  <img 
                                    src={winner.image_url} 
                                    alt={winner.name} 
                                    className="size-full object-cover transition-transform group-hover:scale-102"
                                  />
                                ) : (
                                  <LuUser className="size-20 text-amber-300" />
                                )}
                              </div>

                              <div className="p-5 sm:p-6 space-y-2.5">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2.5 py-1 rounded-xl inline-block shadow-sm">
                                  WINNER
                                </span>
                                <h4 className="font-black text-slate-800 text-base sm:text-lg leading-tight truncate">{winner.name}</h4>
                                <p className="text-xs text-slate-500 font-medium line-clamp-2">{winner.details || "No platform stated."}</p>
                                
                                <div className="space-y-1.5 pt-2 border-t border-amber-100">
                                  <div className="flex justify-between items-center text-xs font-black text-slate-900">
                                    <span>{count} votes</span>
                                    <span className="text-orange-600">({pct}%)</span>
                                  </div>
                                  <div className="h-2 w-full bg-amber-100/50 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* 2. Runners-up / Other Candidates display below */}
                  <div className="space-y-4">
                    {hasVotes && runnersUp.length > 0 && (
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Other Candidates
                      </h3>
                    )}
                    
                    {hasVotes || runnersUp.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {runnersUp.map((option) => {
                          const count = votesData[option.id] || 0;
                          const pct = totalQVotes > 0 ? Math.round((count / totalQVotes) * 100) : 0;

                          return (
                            <div 
                              key={option.id}
                              className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden flex flex-col group select-none hover:border-slate-300 hover:shadow-md transition-all shadow-sm"
                            >
                              <div className="relative aspect-square w-full bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                                {option.image_url ? (
                                  <img 
                                    src={option.image_url} 
                                    alt={option.name} 
                                    className="size-full object-cover transition-transform group-hover:scale-105" 
                                  />
                                ) : (
                                  <LuUser className="size-12 text-slate-300" />
                                )}
                              </div>

                              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div>
                                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1">{option.name}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium line-clamp-2 mt-1">
                                    {option.details || "No platform stated."}
                                  </p>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-slate-50">
                                  <div className="flex justify-between items-center text-[10px] sm:text-xs">
                                    <span className="font-bold text-slate-700">{count} votes</span>
                                    <span className="font-bold text-orange-600">({pct}%)</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center py-12 text-center space-y-2">
                        <LuVote className="size-8 text-slate-300" />
                        <p className="text-slate-500 text-sm font-bold">No votes recorded yet for this position.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Case 2: Voting in Progress -> Display All Candidates in Equal Standings Grid with Live Counts */
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" /> Live Candidate Standings
                  </h3>
                  
                  {sortedOptions.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {sortedOptions.map((option) => {
                        const count = votesData[option.id] || 0;
                        const pct = totalQVotes > 0 ? Math.round((count / totalQVotes) * 100) : 0;

                        return (
                          <div 
                            key={option.id}
                            className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden flex flex-col group select-none hover:border-slate-300 hover:shadow-md transition-all shadow-sm"
                          >
                            <div className="relative aspect-square w-full bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                              {option.image_url ? (
                                <img 
                                  src={option.image_url} 
                                  alt={option.name} 
                                  className="size-full object-cover transition-transform group-hover:scale-105" 
                                />
                              ) : (
                                <LuUser className="size-12 text-slate-300" />
                              )}
                            </div>

                            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1">{option.name}</h4>
                                <p className="text-[10px] text-slate-400 font-medium line-clamp-2 mt-1">
                                  {option.details || "No platform stated."}
                                </p>
                              </div>

                              <div className="space-y-1.5 pt-2 border-t border-slate-50">
                                <div className="flex justify-between items-center text-[10px] sm:text-xs">
                                  <span className="font-bold text-slate-800">{count} votes</span>
                                  <span className="font-bold text-orange-600">({pct}%)</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center py-12 text-center space-y-2">
                      <LuVote className="size-8 text-slate-300" />
                      <p className="text-slate-500 text-sm font-bold">No candidates found for this section.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StudentResultsPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
          <LuLoader className="size-10 animate-spin text-orange-600" />
          <p className="text-sm text-slate-500 font-bold">Loading election results...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
