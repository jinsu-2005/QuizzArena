"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Zap, Sparkles, LayoutDashboard, PlusCircle, Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {/* Action CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/create"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-sm shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Host a Quiz</span>
            </Link>
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
            <Link
              href="/create"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center text-xs font-bold rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Host a Quiz</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
