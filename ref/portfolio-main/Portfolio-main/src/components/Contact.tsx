'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { ScrambleHeading } from './ScrambleHeading'

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const scriptURL = "https://script.google.com/macros/s/AKfycbz7zECiTzAuOuHzNwn6Sux5eSh9H9QcRZNkHBNYV1kQWE9iCpGzkShKOcNjb34QfCfQ/exec";

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("message", form.message);

      await fetch(scriptURL, {
        method: "POST",
        body: formData,
        mode: "no-cors"
      });

      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 5000)
      setForm({ name: '', email: '', message: '' })
    } catch (error) {
      alert("Network error occurred! Please email directly: work.amaltom@gmail.com")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contact" className="relative py-32 bg-background flex justify-center w-full">
      <style>{`
        .contact-right { padding: clamp(28px, 5vw, 40px) clamp(20px, 6vw, 44px); background: var(--card); border: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent); border-radius: 6px; width: 100%; max-width: 896px; min-height: 500px; display: flex; flex-direction: column; justify-content: center; }
        .form-title { font-family: 'Syne', sans-serif; font-size: 1.75rem; font-weight: 900; letter-spacing: -.03em; line-height: 1.1; color: var(--foreground); margin-bottom: 36px; }
        .form-title .acc { color: var(--primary); }
        .float-group { position: relative; margin-bottom: 32px; display: flex; flex-direction: column; }
        .float-label { position: absolute; top: 14px; left: 0; font-family: 'DM Mono', monospace; font-size: .72rem; letter-spacing: .08em; color: color-mix(in srgb, var(--foreground) 30%, transparent); transition: all .22s cubic-bezier(.22,1,.36,1); pointer-events: none; }
        .float-field { display: block; background: transparent; border: none; border-bottom: 1px solid color-mix(in srgb, var(--foreground) 15%, transparent); padding: 12px 0 8px; font-family: 'DM Mono', monospace; font-size: .85rem; color: var(--foreground); outline: none; width: 100%; transition: border-color .22s; caret-color: var(--primary); }
        .float-field:focus + .float-label, .float-field:not(:placeholder-shown) + .float-label { top: -10px; font-size: .56rem; color: var(--primary); letter-spacing: .18em; font-weight: 500;}
        .float-field-ta { display: block; background: transparent; border: none; border-bottom: 1px solid color-mix(in srgb, var(--foreground) 15%, transparent); padding: 12px 0 8px; font-family: 'DM Mono', monospace; font-size: .85rem; color: var(--foreground); outline: none; width: 100%; resize: none; height: 90px; transition: border-color .22s; caret-color: var(--primary); }
        .float-field-ta:focus + .float-label, .float-field-ta:not(:placeholder-shown) + .float-label { top: -10px; font-size: .56rem; color: var(--primary); letter-spacing: .18em; font-weight: 500;}
        .float-line { position: absolute; bottom: 0; left: 0; width: 0; height: 1px; background: var(--primary); transition: width .3s cubic-bezier(.22,1,.36,1); }
        .float-field:focus ~ .float-line, .float-field-ta:focus ~ .float-line { width: 100%; }
        
        .float-field:-webkit-autofill, .float-field:-webkit-autofill:hover, .float-field:-webkit-autofill:focus,
        .float-field-ta:-webkit-autofill, .float-field-ta:-webkit-autofill:hover, .float-field-ta:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--foreground);
          -webkit-box-shadow: 0 0 0px 1000px var(--card) inset;
          transition: background-color 5000s ease-in-out 0s;
        }

        .send-btn { width: 100%; padding: 15px; background: var(--primary); border: none; font-family: 'DM Mono', monospace; font-size: .72rem; letter-spacing: .2em; color: var(--background); font-weight: 700; cursor: pointer; text-transform: uppercase; transition: all .3s; border-radius: 2px; margin-top: 8px; position: relative; overflow: hidden; }
        .send-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--background) 20%, transparent), transparent); transform: translateX(-100%); transition: transform .5s; }
        .send-btn:hover::after { transform: translateX(100%); }
        .send-btn:hover { filter: contrast(1.1) brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 20%, transparent); }
        .send-btn:active { transform: translateY(0); }
        .success-state { display: none; flex-direction: column; align-items: center; justify-content: center; gap: 20px; width: 100%; flex: 1; text-align: center; }
        .success-state.show { display: flex; }
        .success-icon { width: 60px; height: 60px; background: #28c840; border-radius: 14px; display: flex; align-items: center; justify-content: center; animation: popIn .5s cubic-bezier(.22,1,.36,1); box-shadow: 0 0 20px rgba(40,200,64,.2);}
        .success-msg { font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 900; letter-spacing: -.02em; color: var(--foreground); }
        .success-sub { font-size: .65rem; font-family: 'DM Mono', monospace; color: color-mix(in srgb, var(--foreground) 30%, transparent); letter-spacing: .06em; line-height: 1.9; max-width: 320px; }
        @keyframes popIn { 0% { transform: scale(0) rotate(-12deg); opacity: 0; } 70% { transform: scale(1.1) rotate(2deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }
      `}</style>
      
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 w-full">
        <div className="flex flex-col items-center">
          <ScrambleHeading label="Get in Touch" plain="Let's Work " accent="Together" />
          
          <div className="text-center mb-16 -mt-8">
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Have a project in mind? I'd love to hear about it. Drop me a message and let's build something great.
            </p>
          </div>
        </div>

        <div className="contact-right mx-auto">
          {submitted ? (
            <div className="success-state show">
              <div className="success-icon">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <div className="success-msg">Message sent!</div>
              <div className="success-sub">I'll get back to you as soon as possible.</div>
            </div>
          ) : (
            <>
              <h2 className="form-title">Send a <span className="acc">Message</span></h2>
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="float-group">
                <input required type="text" className="float-field" placeholder=" " id="f-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={loading} />
                <label className="float-label" htmlFor="f-name">Your Name</label>
                <span className="float-line"></span>
              </div>
              
              <div className="float-group">
                <input required type="email" className="float-field" placeholder=" " id="f-email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={loading} />
                <label className="float-label" htmlFor="f-email">Email Address</label>
                <span className="float-line"></span>
              </div>
              
              <div className="float-group">
                <textarea required className="float-field-ta" placeholder=" " id="f-msg" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} disabled={loading}></textarea>
                <label className="float-label" htmlFor="f-msg">Message</label>
                <span className="float-line"></span>
              </div>
              
              <button type="submit" className="send-btn" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}