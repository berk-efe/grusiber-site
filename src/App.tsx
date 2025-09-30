import "./App.css";

import { useEffect, useState } from "react";

import CoolBlock from "./ui/CoolBlock";
import DecryptedText from "./ui/DecryptedText";
import TextType from "./ui/TextType";

function App() {
  const [showNavbar, setShowNavbar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      setShowNavbar(scrollPosition > windowHeight * 0.5);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Sticky Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showNavbar
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
      >
        <div className="glass-bg border-b border-primary/30 px-6 py-3">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <div className="text-primary font-bold text-xl">GRUSIBER</div>
            <div className="flex gap-4">
              <button
                onClick={() => scrollToSection("home")}
                className="btn btn-ghost btn-sm text-primary"
              >
                Ana Sayfa
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="btn btn-ghost btn-sm text-primary"
              >
                Hakkımızda
              </button>
              <button
                onClick={() => scrollToSection("events")}
                className="btn btn-ghost btn-sm text-primary"
              >
                Etkinlikler
              </button>
              <button
                onClick={() => scrollToSection("resources")}
                className="btn btn-ghost btn-sm text-primary"
              >
                Kaynaklar
              </button>
              <button
                onClick={() => scrollToSection("join")}
                className="btn btn-ghost btn-sm text-primary"
              >
                Katılım
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="min-h-screen flex flex-col items-center justify-center px-4"
      >
        <div className="mt-12 md:mt-16 lg:mt-20 text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
          <DecryptedText
            text="GRUSIBER"
            speed={75}
            maxIterations={20}
            animateOn="view"
            revealDirection="center"
          />
        </div>

        <div className="flex-1 flex items-center justify-center w-full">
          <CoolBlock duration={500}>
            <div className="p-6 flex flex-col gap-6">
              <TextType
                text={["Söyle bakalım... ", "Seni buraya hangi rüzgar attı?"]}
                typingSpeed={50}
                pauseDuration={250}
                showCursor={true}
                cursorCharacter="█"
                loop={false}
                noDelete={true}
              />
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={() => scrollToSection("about")}
                  className="btn btn-primary"
                >
                  Siz kimsiniz?
                </button>
                <button
                  onClick={() => scrollToSection("events")}
                  className="btn btn-primary"
                >
                  Etkinlikler
                </button>
                <button
                  onClick={() => scrollToSection("resources")}
                  className="btn btn-primary"
                >
                  Kaynaklar
                </button>
                <button
                  onClick={() => scrollToSection("join")}
                  className="btn btn-primary"
                >
                  Size katılacağım.
                </button>
              </div>
            </div>
          </CoolBlock>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <CoolBlock duration={800}>
          <div className="max-w-4xl mx-auto p-8">
            <h2 className="text-4xl font-bold text-primary mb-6 text-center">
              <DecryptedText text="HAKKIMIZDA" animateOn="view" />
            </h2>
            <div className="text-lg text-center space-y-4">
              {/* Add your about content here */}
              <p>Siber güvenlik meraklıları topluluğu...</p>
            </div>
          </div>
        </CoolBlock>
      </section>

      {/* Events Section */}
      <section
        id="events"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <CoolBlock duration={1000}>
          <div className="max-w-4xl mx-auto p-8">
            <h2 className="text-4xl font-bold text-primary mb-6 text-center">
              <DecryptedText text="ETKİNLİKLER" animateOn="view" />
            </h2>
            {/* Add your events content here */}
          </div>
        </CoolBlock>
      </section>

      {/* Resources Section */}
      <section
        id="resources"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <CoolBlock duration={1200}>
          <div className="max-w-4xl mx-auto p-8">
            <h2 className="text-4xl font-bold text-primary mb-6 text-center">
              <DecryptedText text="KAYNAKLAR" animateOn="view" />
            </h2>
            {/* Add your resources content here */}
          </div>
        </CoolBlock>
      </section>

      {/* Join Section */}
      <section
        id="join"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <CoolBlock duration={1400}>
          <div className="max-w-4xl mx-auto p-8">
            <h2 className="text-4xl font-bold text-primary mb-6 text-center">
              <DecryptedText text="KATILIM" animateOn="view" />
            </h2>
            {/* Add your join content here */}
          </div>
        </CoolBlock>
      </section>
    </>
  );
}

export default App;
