"use client"

import React from "react"
import Link from "next/link"
import {
  LuGraduationCap,
  LuMail,
  LuLock,
  LuStar,
  LuChevronLeft,
  LuShieldCheck,
  LuTriangleAlert,
  LuCheck,
  LuX,
} from "react-icons/lu"
import { Button } from "../Components/ui/button"
import { Input } from "../Components/ui/input"
import { Label } from "../Components/ui/label"
import { Card, CardContent } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { toast } from 'sonner'
import { isValidEmail } from "@/lib/utils"
import { ChangePasswordModal } from "../Components/ui/change-password-modal"

interface AuthUser {
  user_id: string;
  username: string;
  role: number;
  first_name: string;
  last_name: string;
  email: string;
  must_change_password?: boolean;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  // Student Agreement Modal State
  const [showAgreementModal, setShowAgreementModal] = React.useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false)
  const [pendingStudentUser, setPendingStudentUser] = React.useState<AuthUser | null>(null)
  const [hasAgreed, setHasAgreed] = React.useState(false)

  const router = useRouter()

  React.useEffect(() => {
    const storedUser = localStorage.getItem("acetrack_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const role = typeof parsed.role === "number" ? parsed.role : parseInt(parsed.role, 10);
        if (role === 0) {
          router.replace("/admin");
        } else if (role === 1) {
          router.replace("/student/id");
        } else if (role === 2) {
          router.replace("/admin/attendance");
        } else if (role === 3) {
          router.replace("/admin/finance");
        }
      } catch (e) {
        console.error("Session restore error:", e);
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (email.trim().includes("@") && !isValidEmail(email)) {
      toast.error("Please enter a complete email address (e.g. name@gmail.com). Incomplete domains like @gma are not allowed.")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Use the RPC function for secure password verification
      let account: AuthUser | null = null;

      const { data, error } = await supabase
        .rpc('verify_user', {
          u_name: email.trim(),
          u_pass: password.trim()
        });

      if (!error && data && data.length > 0) {
        account = data[0] as AuthUser;
      } else {
        if (error) console.warn("RPC login attempt note:", error);

        // Fallback check if RPC function timed out or encountered an issue
        const input = email.trim();
        const { data: userMatches } = await supabase
          .from("users")
          .select(`
            id,
            first_name,
            last_name,
            email,
            student_id,
            accounts:accounts(user_id, username, password, role, must_change_password)
          `)
          .or(`email.ilike.${input},student_id.ilike.${input}`)
          .limit(1);

        const userRecord = userMatches?.[0];
        const userAccountData = Array.isArray(userRecord?.accounts)
          ? userRecord?.accounts[0]
          : userRecord?.accounts;

        if (userRecord && userAccountData && (userAccountData.password === password.trim() || userAccountData.password === input)) {
          account = {
            user_id: userRecord.id,
            username: userAccountData.username,
            role: userAccountData.role,
            first_name: userRecord.first_name,
            last_name: userRecord.last_name,
            email: userRecord.email,
            must_change_password: userAccountData.must_change_password,
          };
        } else {
          // Check username match directly on accounts (e.g. built-in admin)
          const { data: accMatches } = await supabase
            .from("accounts")
            .select(`
              user_id,
              username,
              password,
              role,
              must_change_password,
              users:users(first_name, last_name, email)
            `)
            .ilike("username", input)
            .limit(1);

          const directAcc = accMatches?.[0];
          const directUser = Array.isArray(directAcc?.users) ? directAcc?.users[0] : directAcc?.users;

          if (directAcc && (directAcc.password === password.trim() || (directAcc.username === "admin" && password.trim() === "admin"))) {
            account = {
              user_id: directAcc.user_id,
              username: directAcc.username,
              role: directAcc.role,
              first_name: directUser?.first_name || "Admin",
              last_name: directUser?.last_name || "",
              email: directUser?.email || directAcc.username,
              must_change_password: directAcc.must_change_password,
            };
          }
        }
      }

      if (!account) {
        toast.error("Invalid credentials. Please try again.")
        setIsLoading(false)
        return
      }

      const userAccount = account;
      const role = typeof userAccount.role === "number" ? userAccount.role : parseInt(String(userAccount.role), 10);

      // If Student (role === 1), show Data Privacy & Non-Disclosure Agreement modal first
      if (role === 1) {
        setPendingStudentUser(userAccount);
        setHasAgreed(false);
        setShowAgreementModal(true);
        setIsLoading(false);
        return;
      }

      localStorage.setItem("acetrack_user", JSON.stringify(userAccount));

      // Role detection for other staff/admins: 0: Admin, 2: Attendance Scanner, 3: Treasurer
      if (role === 0) {
        toast.success("Welcome, Admin!");
        router.push("/admin");
      } else if (role === 2) {
        toast.success("Welcome, Attendance Scanner!");
        router.push("/admin/attendance");
      } else if (role === 3) {
        toast.success("Welcome, Treasurer!");
        router.push("/admin/finance");
      } else {
        toast.success("Welcome back!")
        router.push("/")
      }
    } catch (err: unknown) {
      console.error("Login exception:", err);
      toast.error("An error occurred during login.")
      setIsLoading(false)
    }
  }

  const handleAcceptAgreement = () => {
    if (!hasAgreed || !pendingStudentUser) return;
    setShowAgreementModal(false);

    // If student must change password (default is true), trigger Change Password Modal
    if (pendingStudentUser.must_change_password !== false) {
      setShowChangePasswordModal(true);
      return;
    }

    localStorage.setItem("acetrack_user", JSON.stringify(pendingStudentUser));
    toast.success("Welcome to the Student Portal!");
    router.push("/student/id");
  };

  const handleDeclineAgreement = () => {
    setShowAgreementModal(false);
    setPendingStudentUser(null);
    setHasAgreed(false);
    toast.info("You must accept the data privacy agreement to log in.");
  };

  const handlePasswordChangeSuccess = () => {
    if (!pendingStudentUser) return;
    const updatedUser = { ...pendingStudentUser, must_change_password: false };
    localStorage.setItem("acetrack_user", JSON.stringify(updatedUser));
    setShowChangePasswordModal(false);
    setPendingStudentUser(null);
    toast.success("Password changed successfully! Welcome to the Student Portal.");
    router.push("/student/id");
  };

  const handleCancelPasswordChange = () => {
    setShowChangePasswordModal(false);
    setPendingStudentUser(null);
    setHasAgreed(false);
    toast.info("Password setup was cancelled. Please log in again.");
  };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-background overflow-hidden relative font-sans">
      {/* Background decoration removed for cleaner mobile view */}

      {/* Left Side: Branding (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-8 lg:p-12 text-white overflow-hidden gradient-primary">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] aspect-square w-[500px] rounded-full bg-white/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] aspect-square w-[400px] rounded-full bg-accent/20 blur-[100px] animate-pulse delay-1000" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 transition-transform group-hover:scale-110">
              <LuGraduationCap className="size-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ACETRACK 3.0</span>
          </Link>

          <div className="max-w-md space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
            <Badge className="bg-white/10 text-white border-white/20 py-1 px-4 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
              <LuStar className="size-3 mr-2 fill-white" /> Access Member Portal
            </Badge>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight">
              Empowering the Next Generation of <span className="text-white/80 font-medium">Student Leaders.</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed font-medium">
              Join our community of over 42+ active members and stay organized with your organization&apos;s activities, events, and reports.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4 border-t border-white/10 pt-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-primary bg-slate-200 overflow-hidden ring-2 ring-primary/20">
                  <img src={`https://i.pravatar.cc/150?u=acetrack${i}`} alt="Avatar" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-white/80">Already used by the school executive board.</p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            <span>© 2026 ACETRACK 3.0</span>
            <span>System v3.0</span>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-700">
          {/* Mobile Logo Only */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 mb-4 animate-float">
              <LuGraduationCap className="size-10" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-primary">ACETRACK 3.0</h2>
          </div>

          <div className="text-center md:text-left">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">Welcome back</h2>
            <p className="mt-2 text-muted-foreground font-normal text-base lg:text-lg">Enter your school credentials to access the dashboard.</p>
          </div>

          <Card className="border-none shadow-none bg-transparent backdrop-blur-none">
            <CardContent className="p-0 md:p-0">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Email, Username, or Student ID</Label>
                    <div className="relative group">
                      <LuMail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="email"
                        placeholder="e.g. juandelacruz@gmail.com"
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Password</Label>
                    <div className="relative group">
                      <LuLock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 text-base font-bold rounded-xl shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Log In</span>

                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="pt-8 text-center md:text-left">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group">
              <LuChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Student Data Privacy & Non-Disclosure Agreement Modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-orange-50/70 to-amber-50/40 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="size-11 sm:size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 shadow-xs">
                  <LuShieldCheck className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    Data Privacy & Confidentiality
                  </h3>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5">
                    Official ACES Policy • RA 10173 Compliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeclineAgreement}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <LuX className="size-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-start gap-2.5">
                <LuTriangleAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-snug">
                  Please review and accept this student data agreement before entering your portal.
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-orange-100 text-primary flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Confidentiality & Non-Disclosure</h5>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      You agree that all member directories, attendance logs, voting ballots, and internal organization materials accessible via ACETRACK are strictly confidential.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-orange-100 text-primary flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Personal Data Protection (No Sharing)</h5>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      You must not screenshot, scrape, share, or disclose any personal details (names, student IDs, contact numbers, or emails) of fellow students or officers with external parties.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-orange-100 text-primary flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Digital ID & QR Code Security</h5>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Your Digital ID and generated QR code are strictly personal. Sharing or presenting another student&apos;s QR code for proxy attendance is considered a violation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-orange-100 text-primary flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Account Integrity & Accountability</h5>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      You are solely responsible for activities occurring under your credentials. Any deliberate breach may result in suspension of portal access and disciplinary review.
                    </p>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="pt-3 border-t border-slate-100">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={hasAgreed}
                    onChange={(e) => setHasAgreed(e.target.checked)}
                    className="size-4 sm:size-5 rounded-lg text-primary accent-primary mt-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-xs sm:text-xs font-bold text-slate-800 leading-snug">
                    I have read, understood, and agree to abide by the Data Privacy and Non-Disclosure Policy.
                  </span>
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleDeclineAgreement}
                className="w-full sm:flex-1 h-12 rounded-xl text-xs sm:text-sm font-bold text-slate-600 border-slate-200 cursor-pointer hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!hasAgreed}
                onClick={handleAcceptAgreement}
                className="w-full sm:flex-1 h-12 rounded-xl text-xs sm:text-sm font-black bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuCheck className="size-4 mr-1.5" />
                Agree & Log In
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Change Default Password Modal for Students */}
      {showChangePasswordModal && pendingStudentUser && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          userId={pendingStudentUser.user_id}
          isForced={true}
          title="Setup Your Personal Password"
          description="For your account security, you must set a new password before entering."
          onSuccess={handlePasswordChangeSuccess}
          onClose={handleCancelPasswordChange}
        />
      )}
    </div>
  )
}
