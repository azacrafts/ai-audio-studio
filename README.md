# Acoustic — AI Audio Studio

An AI-powered audio creation platform designed to make audio production more accessible through a single web-based workspace.

The prototype combines AI audio capabilities with a modern web interface and was developed as part of the **AIESEC Business Cup 2026**, where the project became a **Top 3 Finalist**.

## Overview

Acoustic was created as a prototype for an AI Audio Studio — a platform where users can work with AI-powered audio tools through one unified interface.

The project explores both the technical implementation of an AI audio product and its business potential, including the product concept, feature set, pricing direction, and go-to-market strategy.

## Features

- AI-powered audio creation workflow
- Integration with ElevenLabs for AI audio capabilities
- Audio preview and playback
- User authentication and data management
- Web-based studio interface
- Responsive user experience
- Product pricing and subscription concept

## Tech Stack

- **Next.js**
- **TypeScript**
- **React**
- **Supabase**
- **ElevenLabs API**
- **Vercel**

## Architecture

The application is built with Next.js and TypeScript.

Supabase is used for backend services and user-related data, while ElevenLabs provides AI-powered audio functionality.

```text
User
  ↓
Next.js Web Application
  ↓
AI Audio Studio
  ├── ElevenLabs API
  └── Supabase
       ├── Authentication
       └── Data Management
```

## Project Structure

```text
ai-audio-studio/
├── app/              # Application pages and routes
├── components/       # Reusable UI components
├── constants/        # Application constants
├── lib/              # Core application logic
├── public/           # Images, audio and static assets
├── types/            # TypeScript type definitions
├── utils/
│   └── supabase/     # Supabase utilities
└── README.md
```

## Running Locally

Clone the repository:

```bash
git clone https://github.com/azacrafts/ai-audio-studio.git
cd ai-audio-studio
```

Install dependencies:

```bash
npm install
```

Create the required environment configuration for Supabase and ElevenLabs.

Then start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Business Case

This project was developed for the **AIESEC Business Cup 2026**.

**Result:** Top 3 Finalist

The project focused on creating and validating the concept of an AI Audio Studio, including:

- Product value proposition
- Target users and use cases
- Feature prioritization
- Prototype development
- Pricing concept
- Go-to-market direction

## My Contribution

My contribution included:

- Conceptualizing the AI Audio Studio product
- Defining the core value proposition
- Designing the initial feature set
- Developing the product prototype
- Exploring product positioning and pricing
- Defining the go-to-market direction

## Future Improvements

- Expand AI audio generation capabilities
- Improve the studio editing workflow
- Add project and audio library management
- Improve onboarding and user experience
- Develop subscription and usage-based billing
- Expand collaboration features

## Live Demo

The prototype was deployed using Vercel:

https://acoustic-kappa.vercel.app/
