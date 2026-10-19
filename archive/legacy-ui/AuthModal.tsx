/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User } from "../types";
import { registerUser as fbRegisterUser, loginUser as fbLoginUser } from "../firebaseService";
import { 
  X, 
  Lock, 
  Phone, 
  Building, 
  UserCheck, 
  MapPin, 
  User as UserIcon, 
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuthSuccess: (user: User) => void;
  initialMode?: "login" | "register";
  inline?: boolean;
}

// Supported countries (Somalia default + East Africa + UK)
export const COUNTRIES = [
  { code: "+252", name: "Somalia", flag: "🇸🇴" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "+257", name: "Burundi", flag: "🇧🇮" },
  { code: "+211", name: "South Sudan", flag: "🇸🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
];

export const normalizeForCompare = (phone: string, defaultCode: string = "252") => {
  let clean = phone.trim().replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = clean.substring(1);
  }
  const cleanDefault = defaultCode.replace("+", "");
  // If the clean phone already starts with any of our known country prefixes, leave it
  const hasPrefix = COUNTRIES.map(c => c.code.replace("+", "")).some(prefix => clean.startsWith(prefix));
  if (!hasPrefix) {
    clean = `${cleanDefault}${clean}`;
  }
  return clean;
};

// Seed a default demo account so the user has an immediate login example
const DEMO_USER: User = {
  mobile: "+252615551234",
  email: "0615551234@gg.com",
  password: "password",
  contactName: "Ahmed Ali",
  company: "Horn Exports Ltd",
  state: "Lower Shabelle"
};

const ADMIN_USER: User = {
  mobile: "+252619999999",
  email: "admin@hh.com",
  password: "adminpassword",
  contactName: "Sovereign Administrator",
  company: "Sovereign Agricultural Office",
  state: "Banaadir",
  role: "admin"
};

export default function AuthModal({ isOpen = false, onClose = () => {}, onAuthSuccess, initialMode = "login", inline = false }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  
  // Country code selections
  const [loginCountryCode, setLoginCountryCode] = useState("+252");
  const [regCountryCode, setRegCountryCode] = useState("+252");

  // Login fields
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Registration fields
  const [regMobile, setRegMobile] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regContactName, setRegContactName] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regState, setRegState] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize seeded user if none exists in localStorage
  useEffect(() => {
    const existing = localStorage.getItem("hh_registered_users");
    if (!existing) {
      localStorage.setItem("hh_registered_users", JSON.stringify([DEMO_USER, ADMIN_USER]));
    } else {
      try {
        const users = JSON.parse(existing);
        const hasAdmin = users.some((u: any) => u.mobile === "+252619999999" || u.mobile === "0619999999" || u.role === "admin");
        if (!hasAdmin) {
          users.push(ADMIN_USER);
          localStorage.setItem("hh_registered_users", JSON.stringify(users));
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Clear errors on tab shift
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [mode]);

  const getRegisteredUsers = (): User[] => {
    const data = localStorage.getItem("hh_registered_users");
    let users = [DEMO_USER, ADMIN_USER];
    if (data) {
      try {
        users = JSON.parse(data);
        const hasAdmin = users.some((u: any) => u.mobile === "+252619999999" || u.mobile === "0619999999" || u.role === "admin");
        if (!hasAdmin) {
          users.push(ADMIN_USER);
          localStorage.setItem("hh_registered_users", JSON.stringify(users));
        }
      } catch (e) {
        users = [DEMO_USER, ADMIN_USER];
      }
    }
    return users;
  };

  const saveRegisteredUsers = (users: User[]) => {
    localStorage.setItem("hh_registered_users", JSON.stringify(users));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!loginMobile || !loginPassword) {
      setError("Please fill out all fields.");
      setIsLoading(false);
      return;
    }

    try {
      // Try real Firebase Auth + Firestore
      const user = await fbLoginUser(loginMobile, loginCountryCode, loginPassword);
      setSuccess(`Welcome back, ${user.contactName}! (Firebase Secure Connected)`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
        setIsLoading(false);
      }, 1200);
    } catch (fbError: any) {
      console.warn("Firebase login failed:", fbError);
      
      let errorMsg = "Invalid mobile number or password.";
      const errorStr = String(fbError).toLowerCase();
      if (errorStr.includes("permission") || errorStr.includes("denied")) {
        errorMsg = "Database permission denied. Please see the 'Database Connection Guide' on the home page to deploy firestore.rules.";
      } else if (errorStr.includes("auth/user-not-found") || errorStr.includes("auth/wrong-password") || errorStr.includes("invalid-credential")) {
        errorMsg = "Invalid mobile number or password. If you recently migrated to Hostinger, please make sure your account is registered on the new database.";
      } else if (errorStr.includes("auth/operation-not-allowed")) {
        errorMsg = "Firebase Authentication is not fully set up. Please enable 'Email/Password' provider in your Firebase Console.";
      } else if (fbError instanceof Error) {
        try {
          const parsed = JSON.parse(fbError.message);
          if (parsed.error && parsed.error.toLowerCase().includes("permission")) {
            errorMsg = "Firebase permission denied. Please see the 'Database Connection Guide' on the home page to deploy firestore.rules.";
          } else {
            errorMsg = parsed.error || fbError.message;
          }
        } catch (e) {
          errorMsg = fbError.message;
        }
      }
      
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!regMobile || !regPassword || !regContactName || !regCompany || !regState) {
      setError("All fields are required to register.");
      setIsLoading(false);
      return;
    }

    const searchNormalized = normalizeForCompare(regMobile, regCountryCode);
    if (searchNormalized.length < 8) {
      setError("Please enter a valid mobile number.");
      setIsLoading(false);
      return;
    }

    const formattedMobile = `+${searchNormalized}`;
    const newEmail = `${searchNormalized}@gg.com`;

    const newUser: User = {
      mobile: formattedMobile,
      email: newEmail,
      password: regPassword,
      contactName: regContactName.trim(),
      company: regCompany.trim(),
      state: regState.trim()
    };

    try {
      // 1. Try registering in Firebase Auth & Firestore
      const registeredUser = await fbRegisterUser(newUser);

      setSuccess("Account successfully created and secured in Firebase Cloud!");
      setTimeout(() => {
        onAuthSuccess(registeredUser);
        onClose();
        setIsLoading(false);
      }, 1200);
    } catch (fbError: any) {
      console.warn("Firebase registration failed:", fbError);

      let errorMsg = "Registration failed. Please check your network or try again.";
      const errorStr = String(fbError).toLowerCase();
      if (errorStr.includes("permission") || errorStr.includes("denied")) {
        errorMsg = "Database permission denied. Please see the 'Database Connection Guide' on the home page to deploy firestore.rules.";
      } else if (errorStr.includes("email-already-in-use")) {
        errorMsg = "An account with this mobile number already exists.";
      } else if (errorStr.includes("operation-not-allowed")) {
        errorMsg = "Firebase Authentication is not fully set up. Please enable 'Email/Password' provider in your Firebase Console.";
      } else if (fbError instanceof Error) {
        try {
          const parsed = JSON.parse(fbError.message);
          if (parsed.error && parsed.error.toLowerCase().includes("permission")) {
            errorMsg = "Firebase permission denied. Please see the 'Database Connection Guide' on the home page to deploy firestore.rules.";
          } else {
            errorMsg = parsed.error || fbError.message;
          }
        } catch (e) {
          errorMsg = fbError.message;
        }
      }

      setError(errorMsg);
      setIsLoading(false);
    }
  };

  if (inline) {
    return (
      <div className="relative w-full max-w-md mx-auto bg-[#F5F0E1] border-2 border-[#D4AF37] overflow-hidden rounded-2xl shadow-xl flex flex-col z-10 my-6">
        {/* Decorative grain backdrop */}
        <div className="absolute inset-0 bg-grain opacity-10 pointer-events-none" />
        <div className="absolute inset-2 border border-[#D4AF37]/20 pointer-events-none rounded-xl" />

        {/* Header */}
        <div className="bg-[#1C3B2F] p-6 text-center border-b border-[#D4AF37]/30 text-white relative">
          <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block mb-1">
            Horn & Harvest Sovereign Portal
          </span>
          <h3 className="font-serif text-2xl font-bold tracking-wide text-white">
            {mode === "login" ? "Sovereign Sign In" : "Register Farm Account"}
          </h3>
          <p className="text-xs text-white/70 mt-1">
            {mode === "login" 
              ? "Access your registered trade account & orders" 
              : "Create a trading passport with Horn & Harvest"
            }
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#D4AF37]/20 bg-white/50">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider font-bold transition-all ${
              mode === "login"
                ? "bg-[#F5F0E1] text-[#1C3B2F] border-b-2 border-[#D4AF37]"
                : "text-[#1C3B2F]/60 hover:text-[#1C3B2F] hover:bg-white/30"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider font-bold transition-all ${
              mode === "register"
                ? "bg-[#F5F0E1] text-[#1C3B2F] border-b-2 border-[#D4AF37]"
                : "text-[#1C3B2F]/60 hover:text-[#1C3B2F] hover:bg-white/30"
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 relative max-h-[75vh] overflow-y-auto">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2 font-medium"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                  Mobile number or email
                </label>
                <div className="flex gap-2">
                  <div className="relative shrink-0 w-[84px]">
                    <select
                      value={loginCountryCode}
                      onChange={(e) => setLoginCountryCode(e.target.value)}
                      className="w-full pl-2 pr-6 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-xs text-[#1C3B2F] focus:outline-none focus:border-[#D4AF37] appearance-none font-mono cursor-pointer h-10"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-3.5 pointer-events-none text-[#D4AF37]">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-2.5 top-3 w-4 h-4 text-[#D4AF37]" />
                    <input
                      type="text"
                      required
                      placeholder="Mobile number or email"
                      value={loginMobile}
                      onChange={(e) => setLoginMobile(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] h-10 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#1C3B2F] text-white font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:bg-[#1C3B2F]/90 disabled:bg-[#1C3B2F]/50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  {isLoading ? "Signing In..." : "Authenticate"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                    Contact Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed Ali"
                      value={regContactName}
                      onChange={(e) => setRegContactName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                    Company / Farm Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Horn Agro Imports"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                    Mobile number or email
                  </label>
                  <div className="flex gap-2">
                    <div className="relative shrink-0 w-[84px]">
                      <select
                        value={regCountryCode}
                        onChange={(e) => setRegCountryCode(e.target.value)}
                        className="w-full pl-2 pr-6 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-xs text-[#1C3B2F] focus:outline-none focus:border-[#D4AF37] appearance-none font-mono cursor-pointer h-10"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-3.5 pointer-events-none text-[#D4AF37]">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-2.5 top-3 w-4 h-4 text-[#D4AF37]" />
                      <input
                        type="text"
                        required
                        placeholder="Mobile number or email"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37] h-10 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                    State / Region
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lower Shabelle"
                      value={regState}
                      onChange={(e) => setRegState(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                  Set Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#D4AF37] text-[#1C3B2F] font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:bg-[#D4AF37]/90 disabled:bg-[#D4AF37]/50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  {isLoading ? "Creating Account..." : "Create Account & Login"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md bg-[#F5F0E1] border-2 border-[#D4AF37] overflow-hidden rounded-2xl shadow-2xl flex flex-col z-10"
        >
          {/* Decorative grain backdrop */}
          <div className="absolute inset-0 bg-grain opacity-10 pointer-events-none" />
          <div className="absolute inset-2 border border-[#D4AF37]/20 pointer-events-none rounded-xl" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-1.5 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:text-[#D4AF37] transition-all cursor-pointer shadow-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="bg-[#1C3B2F] p-6 text-center border-b border-[#D4AF37]/30 text-white relative">
            <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block mb-1">
              Horn & Harvest Sovereign Portal
            </span>
            <h3 className="font-serif text-2xl font-bold tracking-wide text-white">
              {mode === "login" ? "Sovereign Sign In" : "Register Farm Account"}
            </h3>
            <p className="text-xs text-white/70 mt-1">
              {mode === "login" 
                ? "Access your registered trade account & orders" 
                : "Create a trading passport with Horn & Harvest"
              }
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-[#D4AF37]/20 bg-white/50">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider font-bold transition-all ${
                mode === "login"
                  ? "bg-[#F5F0E1] text-[#1C3B2F] border-b-2 border-[#D4AF37]"
                  : "text-[#1C3B2F]/60 hover:text-[#1C3B2F] hover:bg-white/30"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider font-bold transition-all ${
                mode === "register"
                  ? "bg-[#F5F0E1] text-[#1C3B2F] border-b-2 border-[#D4AF37]"
                  : "text-[#1C3B2F]/60 hover:text-[#1C3B2F] hover:bg-white/30"
              }`}
            >
              Register
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 relative max-h-[75vh] overflow-y-auto">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2 font-medium"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                    Mobile number or email
                  </label>
                  <div className="flex gap-2">
                    <div className="relative shrink-0 w-[84px]">
                      <select
                        value={loginCountryCode}
                        onChange={(e) => setLoginCountryCode(e.target.value)}
                        className="w-full pl-2 pr-6 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-xs text-[#1C3B2F] focus:outline-none focus:border-[#D4AF37] appearance-none font-mono cursor-pointer h-10"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-3.5 pointer-events-none text-[#D4AF37]">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-2.5 top-3 w-4 h-4 text-[#D4AF37]" />
                      <input
                        type="text"
                        required
                        placeholder="Mobile number or email"
                        value={loginMobile}
                        onChange={(e) => setLoginMobile(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] h-10 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#1C3B2F] text-white font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:bg-[#1C3B2F]/90 disabled:bg-[#1C3B2F]/50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    {isLoading ? "Signing In..." : "Authenticate"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                      Contact Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ahmed Ali"
                        value={regContactName}
                        onChange={(e) => setRegContactName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                      Company / Farm Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Horn Agro Imports"
                        value={regCompany}
                        onChange={(e) => setRegCompany(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                      Mobile number or email
                    </label>
                    <div className="flex gap-2">
                      <div className="relative shrink-0 w-[84px]">
                        <select
                          value={regCountryCode}
                          onChange={(e) => setRegCountryCode(e.target.value)}
                          className="w-full pl-2 pr-6 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-xs text-[#1C3B2F] focus:outline-none focus:border-[#D4AF37] appearance-none font-mono cursor-pointer h-10"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-3.5 pointer-events-none text-[#D4AF37]">
                          <ChevronDown className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-2.5 top-3 w-4 h-4 text-[#D4AF37]" />
                        <input
                          type="text"
                          required
                          placeholder="Mobile number or email"
                          value={regMobile}
                          onChange={(e) => setRegMobile(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37] h-10 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                      State / Region
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lower Shabelle"
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1C3B2F]/80 mb-1">
                    Set Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] placeholder-[#1C3B2F]/40 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#D4AF37] text-[#1C3B2F] font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:bg-[#D4AF37]/90 disabled:bg-[#D4AF37]/50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    {isLoading ? "Creating Account..." : "Create Account & Login"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
