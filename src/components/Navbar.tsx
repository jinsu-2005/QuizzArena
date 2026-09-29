"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Zap, Sparkles, LogOut, LayoutDashboard, PlusCircle, Menu, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Navbar() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Sign out error:", err);
      toast.error("Failed to sign out");
    }
  };

  return (
    <nav className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-slate-950 fill-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                BUZZ<span className="text-amber-400">ARENA</span>
              </span>
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 leading-none">
                Real-Time Buzzer
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link
              href="/dashboard"
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Host Hub</span>
            </Link>
            <Link
              href="/create/ai"
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Quiz Generator</span>
            </Link>
            <Link
              href="/quiz/draft/edit"
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-slate-400" />
              <span>Quiz Studio</span>
            </Link>
          </div>

          {/* Auth State */}
          <div className="hidden md:flex items-center gap-3">
            {isPending ? (
              <div className="w-24 h-8 bg-slate-800/60 animate-pulse rounded-lg" />
            ) : session?.user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px] border border-amber-500/40">
                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : "H"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white truncate max-w-[120px]">
                      {session.user.name || "Host"}
                    </span>
                    <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 inline" /> Neon Auth
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/auth/sign-in"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-3">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-amber-400 font-medium py-1.5"
          >
            Host Hub
          </Link>
          <Link
            href="/create/ai"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-amber-400 font-medium py-1.5"
          >
            AI Quiz Generator
          </Link>
          <Link
            href="/quiz/draft/edit"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-amber-400 font-medium py-1.5"
          >
            Quiz Studio
          </Link>

          <div className="pt-3 border-t border-slate-800">
            {session?.user ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-400">
                  Logged in as <span className="text-white font-semibold">{session.user.name}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left text-sm text-red-400 py-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/auth/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-slate-900 text-slate-200 border border-slate-800"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-amber-400 text-slate-950"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
