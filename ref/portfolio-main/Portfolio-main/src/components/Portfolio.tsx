'use client'

import { useState } from 'react'
import { ExternalLink, Github, X, ArrowUpRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrambleHeading } from './ScrambleHeading'

interface Project {
  title: string
  description: string
  tags: string[]
  liveUrl: string
  githubUrl: string
  color: string
  category: string
  gradient: string
  icon: string
  image?: string // Place images in public/images/ and set path like "/images/storyweaver.png"
}

const projects: Project[] = [
  {
    title: "StoryWeaver",
    description: "An interactive storytelling platform where users craft branching narratives with AI-assisted plot generation. Built with React and TypeScript, deployed on Vercel.",
    tags: ["React", "TypeScript", "AI", "Vercel"],
    liveUrl: "https://story-weaver-sooty.vercel.app/",
    githubUrl: "https://github.com/amaltomajith/story-weaver",
    color: "var(--primary)",
    category: "AI Tool",
    gradient: "from-orange-500/20 via-amber-500/10 to-yellow-500/5",
    icon: "📖",
    image: "/images/storyweaver.jpg"
  },
  {
    title: "Sentinel",
    description: "An autonomous cybersecurity honeypot that detects real-time phishing threats and actively engages scammers in time-wasting dialogues. Built with React and dual-LLM APIs, deployed on Vercel.",
    tags: ["React", "TypeScript", "Cybersecurity", "Honeypot"],
    liveUrl: "https://sentil-ai.vercel.app/",
    githubUrl: "https://github.com/amaltomajith/SentilAI",
    color: "var(--primary)",
    category: "Web App",
    gradient: "from-emerald-500/20 via-teal-500/10 to-cyan-500/5",
    icon: "🛒",
    image: "/images/Sentinel.png"
  },
{
   title: "VoiceSQL",
   description: "An AI tool built at Flyingspark that converts voice commands into database queries. It uses Speech-to-Text and LLMs to translate natural language into executable SQL, helping non-technical users interact with databases seamlessly.",
   tags: ["AI/LLMs", "Speech-to-Text", "SQL", "Prompt Engineering"],
    liveUrl: "https://voice-sql-web.vercel.app/",
   githubUrl: "https://github.com/amaltomajith/VoiceSQLWeb",
   color: "var(--primary)",
   category: "Generative AI",
   gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/5",
   icon: "Mic",
   image: "/images/voicesql.jpg"
},
{
   title: "Magnovite Web Portal",
   description: "The full-stack website and registration portal I built as Tech Lead for Christ University's Magnovite event. It handled 2,500+ registrations with zero downtime using real-time tracking and automated slot closures. (Note: The live link points to my archived deployment for that year, as the official domain updates annually).",
   tags: ["Full Stack", "React", "Node.js", "MongoDB"],
   liveUrl: "https://magnovite2025.netlify.app/",
   githubUrl: "#",
   color: "var(--primary)",
   category: "Web Development",
   gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/5",
   icon: "Globe",
   image: "/images/magnovite.png"
},
{
    title: "Hypertraction",
    description: "Built during my time as a Full Stack Developer at Hypertraction. I managed Google Cloud/Workspace integrations and engineered secure email infrastructure (SPF, DKIM, DMARC) for this outbound marketing platform. (Note: The live link belongs to the company; I developed the platform but do not hold ownership rights).",
    tags: ["Google Cloud", "Workspace", "Email Auth", "Full Stack"],
    liveUrl: "https://www.hypertraction.co/",
    githubUrl: "#",
    color: "var(--primary)",
    category: "Cloud & Security",
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/5",
    icon: "Mail",
    image: "/images/hypertraction.jpg"
  },
  {
    title: "TerraLearn",
    description: "An agricultural tool developed for the NASA Space Apps Challenge. It integrates NASA APIs to fetch live soil parameters (like pH) for any map location, evaluating the data to suggest viable crops, predict yields, and assess financial feasibility.",
    tags: ["NASA API", "React", "Data Analytics", "Hackathon"],
    liveUrl: "https://terra-learn-tozc.vercel.app/",
    githubUrl: "https://github.com/amaltomajith/TerraLearn",
    color: "var(--primary)",
    category: "Data Analytics",
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/5",
    icon: "Globe",
    image: "/images/terralearn.png"
  },
  {
    title: "Axiom",
    description: "A machine learning and data mining application built to analyze historical market data and predict stock prices. It features interactive data visualizations to forecast market trends and track portfolio performance.",
    tags: ["Machine Learning", "Data Mining", "Data Viz", "Web App"],
    liveUrl: "https://axiom-ten-henna.vercel.app/",
    githubUrl: "https://github.com/amaltomajith/Axiom",
    color: "var(--primary)",
    category: "Machine Learning",
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/5",
    icon: "LineChart",
    image: "/images/axiom.png"
  }
  ,
  {
    title: "Everhome Chatbot",
    description: "An advanced real-time AI chatbot built for an orphanage. It acts as a digital bridge to seamlessly connect clients and donors directly with the organization to coordinate resources and support.",
    tags: ["AI/LLMs", "React", "API Integration", "Social Impact"],
    liveUrl: "https://ever-home-ui.vercel.app/",
    githubUrl: "#",
    color: "var(--primary)",
    category: "AI Integration",
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/5",
    icon: "Bot",
    image: "/images/everhome.png"
  },
{
   title: "Prepped",
   description: "An AI-driven interview simulator that parses resumes to generate role-specific questions. Features real-time voice response processing and granular feedback on performance and technical accuracy.",
   tags: ["OpenAI", "Speech-to-Text", "NLP", "React", "Resume Parsing"],
   liveUrl: "https://prepped-iota.vercel.app/",
   githubUrl: "https://github.com/amaltomajith/Prepped",
   color: "var(--primary)",
   category: "EdTech / AI",
   gradient: "from-purple-500/20 via-violet-500/10 to-fuchsia-500/5",
   icon: "Mic",
   image: "/images/prepped.png"
}
]

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const hasLiveUrl = project.liveUrl !== '#'
  const hasGithub = project.githubUrl !== '#'

  return (
    <>
      {/* Card */}
      <motion.div
        className="group relative cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}
        onClick={() => setExpanded(true)}
      >
        <div className="relative dark:bg-[#111111] bg-zinc-100 clean-border rounded-2xl overflow-hidden elevated-shadow gentle-animation group-hover:scale-[1.03] group-hover:shadow-xl">
          {/* Project visual - unique per project */}
          <div className={`relative h-52 overflow-hidden bg-gradient-to-br ${project.gradient}`}>
            {project.image ? (
              <img src={project.image} alt={project.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/placeholder.svg' }} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <span className="text-6xl mb-3 group-hover:scale-110 gentle-animation">{project.icon}</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: `color-mix(in srgb, ${project.color} 20%, transparent)`, color: project.color }}
                >
                  {project.category}
                </span>
              </div>
            )}

           {/* Decorative elements unique to each card - ONLY show if there is no image */}
            {!project.image && (
              <>
                <div className="absolute top-4 right-4 w-20 h-20 rounded-full opacity-20" style={{ background: project.color }} />
                <div className="absolute bottom-4 left-4 w-12 h-12 rounded-lg opacity-10 rotate-12" style={{ background: project.color }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-5" style={{ background: project.color }} />
              </>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 gentle-animation flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 gentle-animation flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold bg-black/60 backdrop-blur-sm">
                <ArrowUpRight className="w-4 h-4" />
                View Details
              </div>
            </div>
          </div>

          {/* Card content */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              {project.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="text-[10px] font-mono text-muted-foreground">+{project.tags.length - 3}</span>
              )}
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">{project.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{project.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] dark:bg-[#111111] bg-zinc-100 rounded-2xl overflow-y-auto clean-border elevated-shadow flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setExpanded(false)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 gentle-animation"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Iframe or placeholder */}
              <div className="relative h-[35vh] sm:h-[50vh] bg-muted shrink-0">
                {hasLiveUrl ? (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full relative group/iframe"
                  >
                    <iframe
                      src={project.liveUrl}
                      title={`${project.title} preview`}
                      className="w-full h-full border-none"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin"
                    />
                    <div className="absolute inset-0 bg-transparent group-hover/iframe:bg-black/10 gentle-animation" />
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover/iframe:opacity-100 gentle-animation flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold bg-black/60 backdrop-blur-sm">
                      <ExternalLink className="w-4 h-4" />
                      Open Website
                    </div>
                  </a>
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${project.gradient} flex items-center justify-center`}>
                    <div className="text-center">
                      <span className="text-8xl block mb-4">{project.icon}</span>
                      <p className="text-muted-foreground font-mono text-sm">Coming Soon</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Project details */}
              <div className="p-5 sm:p-8 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block"
                      style={{ background: `color-mix(in srgb, ${project.color} 15%, transparent)`, color: project.color }}
                    >
                      {project.category}
                    </span>
                    <h2 className="text-2xl font-black text-foreground">{project.title}</h2>
                  </div>
                </div>
                
                <p className="text-muted-foreground leading-relaxed mb-6">{project.description}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map(tag => (
                    <span key={tag} className="text-xs font-mono px-3 py-1 rounded-full border border-border text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {hasLiveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl text-white font-semibold text-sm gentle-animation hover:scale-105"
                      style={{ background: project.color }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Live
                    </a>
                  )}
                  {hasGithub && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl font-semibold text-sm clean-border text-foreground gentle-animation hover:scale-105 bg-background"
                    >
                      <Github className="w-4 h-4" />
                      View on GitHub
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function Portfolio() {
  return (
    <section id="portfolio" className="relative py-32 bg-background">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12">
        <ScrambleHeading label="Featured Projects" plain="My " accent="Work" />
        <div className="text-center mb-20 -mt-6">
          <p className="text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Building smart, efficient systems — from security tools to AI-powered apps.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}