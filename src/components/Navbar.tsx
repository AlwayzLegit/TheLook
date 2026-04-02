"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [animating, setAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Glassmorphism when scrolled or not on home
  const showGlass = scrolled || !isHome;

  const handleClose = () => {
    setAnimating(true);
    if (overlayRef.current) {
      overlayRef.current.style.opacity = "0";
      overlayRef.current.style.transform = "translateY(-20px)";
    }
    setTimeout(() => {
      setIsOpen(false);
      setAnimating(false);
    }, 250);
  };

  const handleOpen = () => {
    setIsOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.style.opacity = "1";
          overlayRef.current.style.transform = "translateY(0)";
        }
      });
    });
  };

  const handleToggle = () => {
    if (isOpen) handleClose();
    else handleOpen();
  };

  return (
    <>
      {/* Navbar — Glassmorphism on scroll */}
      <nav
        className="fixed top-0 left-0 right-0 transition-all duration-500"
        style={{
          backgroundColor: showGlass ? "rgba(19, 19, 23, 0.85)" : "transparent",
          backdropFilter: showGlass ? "blur(20px)" : "none",
          WebkitBackdropFilter: showGlass ? "blur(20px)" : "none",
          zIndex: 100,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="transition-opacity duration-300 hover:opacity-80">
              <Image
                src="/images/logo.png"
                alt="The Look Hair Salon"
                width={100}
                height={53}
                className="brightness-0 invert opacity-90"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative px-5 py-2 text-[11px] tracking-[0.25em] uppercase transition-all duration-400"
                    style={{ 
                      fontFamily: "var(--font-label)",
                      color: pathname === link.href 
                        ? "var(--color-primary)" 
                        : "var(--color-on-surface-variant)"
                    }}
                    onMouseEnter={(e) => {
                      if (pathname !== link.href) {
                        e.currentTarget.style.color = "var(--color-primary-dim)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pathname !== link.href) {
                        e.currentTarget.style.color = "var(--color-on-surface-variant)";
                      }
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              
              {/* CTA Button — separated */}
              <div 
                className="ml-8 pl-8"
                style={{ borderLeft: "1px solid rgba(71, 70, 76, 0.3)" }}
              >
                <Link
                  href="/book"
                  className="btn-rose inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase px-7 py-3 rounded-sm"
                >
                  Book Now
                </Link>
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={handleToggle}
              disabled={animating}
              className="lg:hidden w-10 h-10 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="var(--color-on-surface)" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="var(--color-on-surface)" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay — full dark with glassmorphism */}
      {isOpen && (
        <div
          ref={overlayRef}
          className="lg:hidden"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
            background: "rgba(19, 19, 23, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            opacity: 0,
            transform: "translateY(-20px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          <div
            className="flex flex-col items-center justify-center gap-8"
            style={{ height: "100vh" }}
          >
            {navLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleClose}
                className="text-lg tracking-[0.3em] uppercase transition-colors duration-400"
                style={{
                  fontFamily: "var(--font-label)",
                  color: pathname === link.href 
                    ? "var(--color-primary)" 
                    : "var(--color-on-surface)",
                  opacity: 0,
                  transform: "translateY(10px)",
                  animation: `fadeSlideIn 0.3s ease forwards ${0.1 + i * 0.05}s`,
                }}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/book"
              onClick={handleClose}
              className="btn-rose mt-6 text-[12px] tracking-[0.2em] uppercase px-10 py-4 rounded-sm"
              style={{
                opacity: 0,
                animation: `fadeSlideIn 0.3s ease forwards ${0.1 + navLinks.length * 0.05}s`,
              }}
            >
              Book Now
            </Link>

            <p
              className="text-xs tracking-wider"
              style={{ 
                fontFamily: "var(--font-label)",
                color: "var(--color-outline)",
                position: "absolute", 
                bottom: 40 
              }}
            >
              (818) 662-5665
            </p>
          </div>
        </div>
      )}
    </>
  );
}
