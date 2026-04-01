// ── Landing Page Entry Point ──────────────────────────────────────
// All sections are organized in app/LandingPage/
// Shared components (Navbar, Footer, Icon) live in app/Components/

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";

import Hero from "./LandingPage/Hero";
import About from "./LandingPage/About";
import Features from "./LandingPage/Features";
import Events from "./LandingPage/Events";
import Announcements from "./LandingPage/Announcements";
import Gallery from "./LandingPage/Gallery";
import Members from "./LandingPage/Members";
import Contact from "./LandingPage/Contact";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Features />
        <Events />
        <Announcements />
        <Gallery />
        <Members />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
