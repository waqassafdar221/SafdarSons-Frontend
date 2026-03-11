"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
  { label: "Location", href: "#location" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-2xl shadow-[0_1px_24px_rgba(0,0,0,0.06)] border-b border-black/[0.04]"
          : "bg-white/50 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16 sm:h-[4.5rem]">
          {/* Logo */}
          <a href="#home" className="flex-shrink-0 group flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shadow-md shadow-primary/25 group-hover:shadow-lg group-hover:shadow-primary/30 transition-shadow duration-300">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="text-lg font-bold text-text-dark block tracking-[-0.03em] group-hover:text-primary transition-colors duration-300">
                Safdar &amp; Sons
              </span>
              <span className="text-xs text-text-muted font-semibold tracking-[0.08em] uppercase">
                Pharma + Vet
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center">
            <div className="flex items-center bg-black/[0.03] rounded-full p-1 gap-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-text-soft hover:text-text-dark hover:bg-white px-4 py-2 rounded-full transition-all duration-300 hover:shadow-sm"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <Link
              href="/login"
              className="ml-4 text-sm font-semibold px-6 py-2.5 rounded-full bg-text-dark text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px transition-all duration-300"
            >
              Login →
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-black/[0.04] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-[5px]">
              <span className={`block w-[18px] h-[1.5px] bg-text-dark rounded-full transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
              <span className={`block w-[18px] h-[1.5px] bg-text-dark rounded-full transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block w-[18px] h-[1.5px] bg-text-dark rounded-full transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-400 ease-in-out ${mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-white/95 backdrop-blur-2xl border-t border-border-soft/30 px-5 py-4 space-y-0.5">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-[15px] font-medium text-text-soft hover:text-text-dark hover:bg-primary-light/40 px-4 py-3 rounded-xl transition-all duration-300"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 px-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block text-center text-sm font-semibold px-6 py-3 rounded-xl bg-text-dark text-white transition-all duration-300"
            >
              Login →
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
