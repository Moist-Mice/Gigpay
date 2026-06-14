'use client'

import { Github, Linkedin, ArrowUpRight, Download, Phone } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative py-20 bg-background text-foreground overflow-hidden border-t border-border">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-12">
          
          {/* Left Side - Brand & Bio */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="text-foreground text-4xl font-extrabold tracking-tight mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
                <span style={{ color: 'var(--primary)' }}>A</span>mal.
              </div>
              <p className="text-muted-foreground leading-relaxed mb-8 font-mono text-sm max-w-sm">
                CS Engineer & Developer passionate about building smart, 
                efficient systems — from cybersecurity tools to AI-powered apps.
              </p>
              
              <div className="flex items-center space-x-6 mb-8">
                <a href="https://github.com/amaltomajith" target="_blank" rel="noopener noreferrer" className="hover:scale-110 gentle-animation cursor-pointer" aria-label="GitHub">
                  <Github className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </a>
                <a href="https://www.linkedin.com/in/amaltomajith" target="_blank" rel="noopener noreferrer" className="hover:scale-110 gentle-animation cursor-pointer" aria-label="LinkedIn">
                  <Linkedin className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </a>
                <a href="tel:+918089446670" className="hover:scale-110 gentle-animation cursor-pointer" aria-label="Phone">
                  <Phone className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Side - Giant CTA */}
          <div className="flex flex-col md:items-end justify-center">
            <div className="md:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border mb-6 font-mono text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)' }}></span>
                <span className="text-muted-foreground">Available for new opportunities</span>
              </div>
              
              <h3 className="text-3xl sm:text-5xl lg:text-6xl font-black text-foreground leading-tight mb-8 break-words w-full" style={{ fontFamily: "'Syne', sans-serif" }}>
                Let's build <br />
                <span className="text-muted-foreground">something</span> <br />
                <span style={{ color: 'var(--primary)' }}>extraordinary.</span>
              </h3>
              
              <div className="flex flex-col sm:flex-row items-center justify-end gap-6 sm:gap-8 w-full">
                <a 
                  href="/files/cv.pdf" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-lg sm:text-xl font-bold border-b-2 pb-1 gentle-animation hover:pr-4"
                  style={{ borderColor: 'color-mix(in srgb, var(--foreground) 30%, transparent)', color: 'var(--foreground)' }}
                >
                  <Download className="w-5 h-5" /> Download CV 
                </a>

                <a 
                  href="mailto:work.amaltom@gmail.com" 
                  className="inline-flex items-center gap-2 text-lg sm:text-xl font-bold border-b-2 pb-1 gentle-animation hover:pr-4"
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  Send an Email <ArrowUpRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8 mt-20 font-mono flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} Amal Tom Ajith. All rights reserved.</div>
          <div className="text-sm text-muted-foreground">Bangalore, India 🇮🇳</div>
        </div>
      </div>
      
      {/* Huge Background Text */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none flex justify-center opacity-[0.03]">
        <span className="text-[20vw] font-black leading-none whitespace-nowrap" style={{ fontFamily: "'Syne', sans-serif" }}>
          AMAL TOM
        </span>
      </div>
    </footer>
  )
}