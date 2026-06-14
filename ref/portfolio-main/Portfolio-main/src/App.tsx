import { ThemeProvider } from 'next-themes'
import { Hero } from './components/Hero'
import { Portfolio } from './components/Portfolio'
import { Awards } from './components/Awards'
import { About } from './components/About'
import { Services } from './components/Services'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { ChatBot } from './components/ChatBot'
import { CustomCursor } from './components/CustomCursor'
import SkillsCanvas from './components/SkillsCanvas'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="min-h-screen bg-background text-foreground" style={{ overflow: 'visible' }}>
        <CustomCursor />
        <ChatBot />
        <main className="relative" role="main" style={{ overflow: 'visible' }}>
          <section id="hero" aria-label="Hero section">
            <Hero />
          </section>
          <section id="about" aria-label="About & Experience section">
            <About />
          </section>
          <section id="tech-stack" aria-label="Tech Stack section">
            <SkillsCanvas />
          </section>
          <section id="portfolio" aria-label="Portfolio section">
            <Portfolio />
          </section>
          <section id="services" aria-label="Services section">
            <Services />
          </section>
          <section id="awards" aria-label="Awards section">
            <Awards />
          </section>
          <section id="contact" aria-label="Contact section">
            <Contact />
          </section>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}
