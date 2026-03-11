export default function Contact() {
  return (
    <section id="contact" className="bg-bg-warm py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        {/* Section heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.08] border border-primary/15 mb-4">
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">
              Get in Touch
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-dark tracking-[-0.03em]">
            Contact Us
          </h2>
          <p className="text-text-soft text-base sm:text-[17px] mt-3 max-w-md mx-auto leading-relaxed">
            Reach out to us anytime — we&apos;re here to help with all your
            pharmacy and veterinary needs.
          </p>
        </div>

        {/* Contact Grid */}
        <div className="max-w-4xl mx-auto">
          {/* WhatsApp CTA Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#128c7e] to-[#075e54] p-8 sm:p-10 text-center mb-6 shadow-xl shadow-[#128c7e]/15">
            <div className="relative z-10">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/15 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Chat with us on WhatsApp</h3>
              <p className="text-white/70 text-sm mb-6 max-w-sm mx-auto">
                Get instant replies for medicine inquiries, orders, and veterinary consultations.
              </p>
              <a
                href="https://wa.me/923062088148"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3 bg-white text-[#128c7e] text-sm font-bold rounded-full hover:bg-white/90 hover:shadow-lg hover:-translate-y-px transition-all duration-300"
              >
                Start Chat
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Phone */}
            <div className="group bg-white rounded-2xl border border-border-soft/60 p-6 text-center hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-px hover:border-primary/20 transition-all duration-300">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-light flex items-center justify-center mb-3.5 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary-dark transition-all duration-300">
                <svg className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <p className="text-xs text-text-muted font-medium mb-1">Phone</p>
              <p className="text-sm font-bold text-text-dark">+92 306 2088148</p>
            </div>

            {/* Email */}
            <div className="group bg-white rounded-2xl border border-border-soft/60 p-6 text-center hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-px hover:border-primary/20 transition-all duration-300">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-light flex items-center justify-center mb-3.5 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary-dark transition-all duration-300">
                <svg className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs text-text-muted font-medium mb-1">Email</p>
              <p className="text-sm font-bold text-text-dark">info@safdarandsons.com</p>
            </div>

            {/* Hours */}
            <div className="group bg-white rounded-2xl border border-border-soft/60 p-6 text-center hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-px hover:border-primary/20 transition-all duration-300">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-light flex items-center justify-center mb-3.5 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary-dark transition-all duration-300">
                <svg className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-text-muted font-medium mb-1">Business Hours</p>
              <p className="text-sm font-bold text-text-dark">9:00 AM – 10:00 PM</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
