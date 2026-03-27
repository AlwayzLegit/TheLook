import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy">
      <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-8 lg:px-12 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="font-heading text-2xl text-white tracking-wider mb-4">
              THE LOOK
            </h3>
            <p className="text-white/70 text-sm font-body font-light leading-relaxed">
              Family owned &amp; operated since 11.11.11. Your neighborhood
              salon in Glendale, CA.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-gold text-[11px] tracking-[0.2em] uppercase font-body mb-5">
              Navigate
            </h4>
            <div className="space-y-3">
              {[
                { href: "/services", label: "Services" },
                { href: "/gallery", label: "Gallery" },
                { href: "/about", label: "About" },
                { href: "/book", label: "Book Online" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-white/70 hover:text-gold text-sm font-body font-light transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-gold text-[11px] tracking-[0.2em] uppercase font-body mb-5">
              Salon Hours
            </h4>
            <div className="text-sm font-body font-light space-y-2">
              <div className="flex justify-between text-white/70">
                <span>Monday</span>
                <span>10 – 6</span>
              </div>
              <div className="flex justify-between text-rose/70">
                <span>Tuesday</span>
                <span>Closed</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Wed – Sat</span>
                <span>10 – 6</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Sunday</span>
                <span>10 – 5</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-gold text-[11px] tracking-[0.2em] uppercase font-body mb-5">
              Contact
            </h4>
            <div className="text-sm font-body font-light space-y-2 text-white/70">
              <p>919 South Central Ave Suite #E</p>
              <p>Glendale, CA 91204</p>
              <p className="pt-2">
                <a href="tel:+18186625665" className="hover:text-gold transition-colors">
                  (818) 662-5665
                </a>
              </p>
              <p>
                <a href="mailto:look_hairsalon@yahoo.com" className="hover:text-gold transition-colors">
                  look_hairsalon@yahoo.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-14 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-xs font-body">
            &copy; {new Date().getFullYear()} The Look Hair Salon. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://www.instagram.com/thelookhairsalon/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/50 hover:text-gold transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
            </a>
            <a href="https://www.facebook.com/p/The-Look-Hair-Salon-100046925091028/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-white/50 hover:text-gold transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z" /></svg>
            </a>
            <a href="https://www.yelp.com/biz/the-look-hair-salon-glendale" target="_blank" rel="noopener noreferrer" aria-label="Yelp" className="text-white/50 hover:text-gold transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 011.596-.206 7.26 7.26 0 011.96 3.164c.252.754-.09 1.478-.29 1.547zm-7.455 5.13l1.105-5.088c.226-.98 1.59-1.048 1.923-.096l1.703 4.872c.22.63-.14 1.31-.796 1.508a7.073 7.073 0 01-3.635.04c-.76-.196-.506-1.236-.3-1.236zm-3.31-4.636l4.923 1.688c.952.326.952 1.64 0 1.966l-4.923 1.688c-.632.217-1.278-.258-1.36-.928a7.09 7.09 0 010-3.486c.082-.67.728-1.145 1.36-.928zM5.7 6.705c.14-.67.86-1.016 1.468-.71l4.472 2.252c.884.445.69 1.74-.282 1.887l-5.194.8c-.645.098-1.222-.39-1.28-1.04a7.12 7.12 0 01.816-3.189zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
