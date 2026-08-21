// ── Landing Page Entry Point ──────────────────────────────────────
// All sections are organized in app/LandingPage/
// Shared components (Navbar, Footer, Icon) live in app/Components/

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";

import Hero from "./LandingPage/Hero";
import Events from "./LandingPage/Events";
import Members from "./LandingPage/Members";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Events />
        <Members />
      </main>
      <Footer />
    </>
  );
}
