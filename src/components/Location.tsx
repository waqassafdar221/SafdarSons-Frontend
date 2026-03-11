export default function Location() {
  return (
    <section id="location" className="bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        {/* Section heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.08] border border-primary/15 mb-4">
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">
              Find Us
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-dark tracking-[-0.03em]">
            Our Location
          </h2>
        </div>

        {/* Location Card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-bg rounded-3xl border border-border-soft/60 overflow-hidden shadow-lg shadow-black/[0.03]">
            {/* Map embed */}
            <div className="w-full h-[220px] sm:h-[260px] bg-gradient-to-br from-primary-light to-bg-warm relative">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3500.863286760826!2d70.6574507!3d28.6638119!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3939f7e6a6036925%3A0xf82699b30c21a4f5!2sSafdar%20%26%20Sons%20Pharma%20%2B%20Veterinary%20Store!5e0!3m2!1sen!2s!4v1773248682064!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale-[30%] opacity-90"
              />
              {/* Map overlay badge */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-semibold text-text-dark">We are here</span>
                </div>
              </div>
            </div>

            {/* Address details */}
            <div className="p-7 sm:p-9 space-y-6">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-md shadow-primary/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-text-dark">
                    Safdar &amp; Sons Pharma + Veterinary Store
                  </h3>
                  <div className="space-y-2 text-text-soft text-sm leading-relaxed">
                    <p className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>Near Ravi Town, NawanKot Road<br />Khanpur, 6100 Pakistan</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Open Daily: 9:00 AM – 10:00 PM</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>+92 306 2088148</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border-soft/80" />

              {/* Get Directions Button */}
              <div className="flex justify-center">
                <a
                  href="https://maps.google.com/?q=28.6638119,70.6574507"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 px-7 py-3 bg-text-dark text-white text-sm font-semibold rounded-full hover:bg-primary hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Get Directions
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
