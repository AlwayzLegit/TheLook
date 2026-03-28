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

  const showSolid = scrolled || !isHome;

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
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  const handleLinkClick = () => {
    handleClose();
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 transition-all duration-500"
        style={{
          backgroundColor: showSolid ? "rgba(26, 26, 46, 0.95)" : "transparent",
          backdropFilter: showSolid ? "blur(12px)" : "none",
          WebkitBackdropFilter: showSolid ? "blur(12px)" : "none",
          zIndex: 100,
        }}
      >
        {/* Subtle bottom border when scrolled */}
        {showSolid && (
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
        )}

        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="relative">
              <Image
                src="/images/logo.png"
                alt="The Look Hair Salon"
                width={100}
                height={53}
                className="brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-5 py-2 text-[11px] tracking-[0.25em] uppercase font-body transition-colors duration-300 ${
                      isActive(link.href)
                        ? "text-gold"
                        : "text-white/70 hover:text-gold"
                    }`}
                  >
                    {link.label}
                    {/* Active indicator */}
                    {isActive(link.href) && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-gold" />
                    )}
                  </Link>
                ))}
              </div>
              <div className="ml-8 pl-8 border-l border-white/10">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-7 py-3 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(184,36,59,0.3)] hover:-translate-y-0.5"
                >
                  Book Now
                </Link>
              </div>
            </div>

            {/* Mobile hamburger / X */}
            <button
              onClick={handleToggle}
              disabled={animating}
              className="lg:hidden w-10 h-10 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
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
            background: "rgba(26, 26, 46, 0.98)",
            opacity: 0,
            transform: "translateY(-20px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          {/* Decorative background glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(196,162,101,0.08)_0%,transparent_70%)]" />

          <div
            className="flex flex-col items-center justify-center gap-8 relative"
            style={{ height: "100vh" }}
          >
            {navLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className={`text-lg tracking-[0.3em] uppercase font-body transition-colors ${
                  isActive(link.href) ? "text-gold" : "text-white hover:text-gold"
                }`}
                style={{
                  opacity: 0,
                  transform: "translateY(10px)",
                  animation: `fadeSlideIn 0.3s ease forwards ${0.1 + i * 0.05}s`,
                }}
              >
                {link.label}
              </Link>
            ))}

            <div
              className="w-12 h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent mt-2"
              style={{
                opacity: 0,
                animation: `fadeSlideIn 0.3s ease forwards ${0.1 + navLinks.length * 0.05}s`,
              }}
            />

            <Link
              href="/book"
              onClick={handleLinkClick}
              className="mt-2 inline-block bg-rose text-white text-[12px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-rose-light transition-colors"
              style={{
                opacity: 0,
                animation: `fadeSlideIn 0.3s ease forwards ${0.15 + navLinks.length * 0.05}s`,
              }}
            >
              Book Now
            </Link>

            <p
              className="text-white/30 text-xs font-body tracking-wider"
              style={{ position: "absolute", bottom: 40 }}
            >
              (818) 662-5665
            </p>
          </div>

          {/* CSS animation keyframes */}
          <style jsx>{`
            @keyframes fadeSlideIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
