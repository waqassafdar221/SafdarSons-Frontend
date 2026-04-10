import Image from "next/image";

const highlights = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Licensed Pharmacy",
    desc: "Verified and certified for your safety",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Veterinary Care",
    desc: "Comprehensive animal healthcare",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Expert Support",
    desc: "Knowledgeable and caring staff",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "Full Inventory",
    desc: "5,000+ products always in stock",
  },
];

export default function About() {
  return (
    <section id="about" className="bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Image */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/8">
              <Image
                src="/images/about-pharmacy.jpg"
                alt="Inside Safdar & Sons Pharmacy"
                width={700}
                height={520}
                className="w-full h-[300px] sm:h-[380px] lg:h-[460px] object-cover"
              />
            </div>
            {/* Experience badge */}
            <div className="absolute -bottom-4 -right-4 sm:-right-6 bg-white rounded-2xl shadow-xl shadow-black/8 p-4 animate-float-delayed hidden sm:block">
              <div className="text-center">
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">2+</p>
                <p className="text-xs font-medium text-text-muted mt-0.5">Years of Trust</p>
              </div>
            </div>
            {/* Decorative accent */}
            <div className="absolute -z-10 -top-4 -left-4 w-full h-full rounded-3xl bg-gradient-to-br from-primary/10 to-primary-muted/5 hidden lg:block" />
          </div>

          {/* Right: Text Content */}
          <div className="space-y-6">
            {/* Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.08] border border-primary/15">
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                Who We Are
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-text-dark leading-tight tracking-[-0.03em]">
              Caring for families{" "}
              {/* <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                &amp; animals
              </span>{" "} */}
              since 2025
            </h2>

            <p className="text-text-soft leading-relaxed text-base sm:text-[17px]">
              Safdar &amp; Sons Pharma + Veterinary Store is dedicated to serving
              families, patients, and animal care needs with trusted medicines,
              dependable support, and a commitment to quality that spans over a decade.
            </p>

            {/* Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {highlights.map((item, index) => (
                <div
                  key={index}
                  className="group flex items-start gap-3.5 px-4 py-4 rounded-2xl bg-bg border border-border-soft/60 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-px transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-light to-primary/10 flex items-center justify-center text-primary group-hover:from-primary group-hover:to-primary-dark group-hover:text-white transition-all duration-300">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-dark">{item.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
