# Amal's Developer Portfolio

A sleek, premium, and highly responsive developer portfolio built with modern web technologies. Designed with a focus on deep aesthetics, micro-interactions, and flawless typography.

## ✨ Features

- **Next-Gen Aesthetics**: Custom dark/light mode theming seamlessly shifting between vibrant Orange and Blue accent bounds.
- **Dynamic Scramble Text**: Built-in intersection observer components that trigger matrix-style text scrambling effects conditionally on scroll.
- **Floating Label Forms**: A completely custom, zero-dependency Contact form featuring premium floating labels, WebKit autofill overrides, and identical active/success geometrical sizing.
- **Serverless Emails**: The Contact block directly ties into a Google Apps Script backend using a `no-cors` fetch POST request, eliminating the need for paid third-party email APIs.
- **Native Routing**: Direct anchor links and cleanly integrated raw file routing (e.g., CV PDF downloads).

## 🛠️ Tech Stack

- **Core**: React.js 18 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS & Embedded Dynamic CSS Modules
- **Typography**: Syne (Headings) & DM Mono (Monospace/Technical)
- **Icons**: Lucide React
- **Backend**: Google Apps Script (Email Relay)

## 🚀 Getting Started

### 1. Installation

First, clone the repository and install the Node dependencies:

```bash
git clone https://github.com/amaltomajith/portfolio-main.git
cd portfolio-main
npm install
```

### 2. Run Locally

Start the Vite development web server:

```bash
npm run dev
```

Your portfolio should now be running at `http://localhost:8080` (or another available port).

### 3. Build for Production

Compile the TypeScript and build the optimized static assets:

```bash
npm run build
```

## 📧 Contact Form Backend Setup

The Contact form (`src/components/Contact.tsx`) is designed to operate completely serverlessly using Google Apps Script. 

If you ever need to change the destination email address or regenerate the script URL:
1. Create a new Google Apps Script.
2. Write a `doPost(e)` function that parses the incoming `FormData` and uses `MailApp.sendEmail(...)` to forward it to your inbox.
3. Deploy the script strictly as a **Web App** with the permissions:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the newly generated Web App URL and paste it into the `fetch()` handler inside `src/components/Contact.tsx`. 

## 🌐 Deployment

The output from `npm run build` is a standard static footprint (`/dist` folder) that can be seamlessly deployed to Vercel, Netlify, or GitHub Pages with zero configuration needed.
