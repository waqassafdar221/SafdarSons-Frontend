import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Location from "@/components/Location";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Contact />
        <Location />
      </main>
      <Footer />
    </>
  );
}
