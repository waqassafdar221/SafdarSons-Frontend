import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Contact Us", href: "#contact" },
  { label: "Location", href: "#location" },
  { label: "Login", href: "/login" },
];

export default function Footer() {
  return (
    <footer className="bg-dark-surface relative overflow-hidden">
      {/* Gradient top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          {/* Left: Brand */}
          <div className="md:col-span-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  Safdar &amp; Sons Pharma
                </h3>
                <p className="text-[10px] text-white/35 font-semibold tracking-[0.1em] uppercase">
                  Veterinary Store
                </p>
              </div>
            </div>
            <p className="text-sm text-white/45 leading-relaxed max-w-sm">
              Your trusted partner for pharmacy and veterinary healthcare
              products. Committed to quality, care, and reliability for over 15 years.
            </p>
            {/* Social-like badges */}
            <div className="flex items-center gap-2 pt-1">
              <a href="https://wa.me/923062088148" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-primary/20 flex items-center justify-center transition-colors duration-300">
                <svg className="w-4 h-4 text-white/50 hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
              <a href="tel:+923062088148" className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-primary/20 flex items-center justify-center transition-colors duration-300">
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
              <a href="mailto:info@safdarandsons.com" className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-primary/20 flex items-center justify-center transition-colors duration-300">
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Middle: Quick Links */}
          <div className="md:col-span-3">
            <h4 className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.15em] mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="group text-sm text-white/50 hover:text-white transition-colors duration-300 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-primary transition-colors duration-300" />
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="group text-sm text-white/50 hover:text-white transition-colors duration-300 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-primary transition-colors duration-300" />
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Contact Info */}
          <div className="md:col-span-4">
            <h4 className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.15em] mb-5">
              Contact Info
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 mb-0.5 font-medium">Phone</p>
                  <p className="text-sm text-white/65">+92 306 2088148</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 mb-0.5 font-medium">Address</p>
                  <p className="text-sm text-white/65">
                    Near Ravi Town, NawanKot Road<br />Khanpur, 6100 Pakistan
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 mb-0.5 font-medium">Hours</p>
                  <p className="text-sm text-white/65">9:00 AM – 10:00 PM Daily</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06] relative z-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-white/25">
              © {new Date().getFullYear()} Safdar &amp; Sons Pharma + Veterinary Store
            </p>
            <p className="text-[11px] text-white/25">
              Serving the community with care and trust
            </p>
          </div>
        </div>
      </div>

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
    </footer>
  );
}
