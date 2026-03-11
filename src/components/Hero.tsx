import Image from "next/image";

const stats = [
  { value: "15+", label: "Years Trusted" },
  { value: "10K+", label: "Happy Customers" },
  { value: "5K+", label: "Products" },
];

export default function Hero() {
  return (
    <section id="home" className="relative bg-bg overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-40 w-[600px] h-[600px] bg-primary-muted/[0.06] rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/[0.02] to-transparent rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-12 md:pt-14 md:pb-16 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left: Text Content */}
          <div className="space-y-5">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/15">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-semibold text-primary tracking-wide">
                Trusted Pharmacy &amp; Vet Support
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold text-text-dark leading-[1.1] tracking-[-0.035em]">
              Your Trusted{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                  Pharmacy
                </span>
              </span>
              <br />
              &amp; Veterinary
              <br />
              Care Partner
            </h1>

            {/* Paragraph */}
            <p className="text-base sm:text-lg text-text-soft leading-relaxed max-w-md">
              Safdar &amp; Sons delivers essential medicines, healthcare products,
              and veterinary support with care, reliability, and a promise
              of quality you can count on.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#about"
                className="group inline-flex items-center gap-2 px-7 py-3 bg-text-dark text-white text-sm font-semibold rounded-full hover:bg-primary hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-[1px] transition-all duration-300"
              >
                Explore More
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-text-dark rounded-full border-2 border-border-soft hover:border-primary/30 hover:bg-primary-light/40 transition-all duration-300"
              >
                Get in Touch
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-2">
              {stats.map((stat, i) => (
                <div key={i} className="relative">
                  <p className="text-2xl sm:text-3xl font-bold text-text-dark tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative lg:pl-4">
            <div className="relative">
              {/* Main image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
                <Image
                  src="/images/hero section.png"
                  alt="Safdar & Sons Pharmacy Store"
                  width={800}
                  height={600}
                  className="w-full h-[320px] sm:h-[400px] lg:h-[480px] object-cover"
                  priority
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>

              {/* Floating card */}
              <div className="absolute -bottom-5 -left-5 sm:-left-8 bg-white rounded-2xl shadow-xl shadow-black/8 p-4 sm:p-5 animate-float hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-dark">Verified Store</p>
                    <p className="text-xs text-text-muted">Licensed &amp; Certified</p>
                  </div>
                </div>
              </div>

              {/* Floating accent dot */}
              <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full bg-gradient-to-br from-primary-muted/30 to-primary/10 blur-xl animate-pulse-soft" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
