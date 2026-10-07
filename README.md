# 🎧 Acoustic — AI Audio Studio

All-in-one AI audio platform for content creators. Generate copyright-free music, SFX, and edit audio — all in a single workflow.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **AI Music**: Suno API / Stable Audio API
- **Storage**: Cloudflare R2
- **Auth + DB**: Supabase (Phase 4)
- **Payments**: Stripe (Phase 5)
- **Audio Processing**: FFmpeg (Phase 6)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local .env.local
# Fill in your API keys (see .env.local for all variables)
```

> **Dev mode**: If API keys are left as placeholders, the app uses mock audio from SoundHelix (public domain). You can test the full UI/UX without any keys.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## MVP Feature Coverage (Phases 1–3)

| Feature | Status |
|---|---|
| Preset landing page with video grid | ✅ |
| Hover-to-play audio previews | ✅ |
| AI generation form (prompt, preset, model, duration) | ✅ |
| `POST /api/generate` with daily rate limiting | ✅ |
| Mock AI mode (no API key needed) | ✅ |
| Audio player with waveform visualizer | ✅ |
| Watermark notice for free plan | ✅ |
| Upgrade CTA modal (paywall) | ✅ |
| Pricing page | ✅ |
| `GET /api/presets` | ✅ |
| `POST /api/process-audio` (FFmpeg stub) | ✅ |

---

## Project Structure

```
acoustic/
├── app/
│   ├── page.tsx              # Presets landing page
│   ├── generate/page.tsx     # AI Studio / generation page
│   ├── pricing/page.tsx      # Pricing page
│   └── api/
│       ├── generate/         # POST — AI music generation
│       ├── presets/          # GET  — preset library
│       └── process-audio/    # POST — FFmpeg processing
├── components/
│   ├── presets/              # PresetCard, PresetGrid
│   ├── generate/             # GenerateForm, AudioPlayer, UpgradeCTA
│   └── shared/               # Navbar
├── constants/
│   └── presets.ts            # 6 preset configs
├── lib/
│   ├── ai/                   # Suno + Stable Audio wrappers
│   ├── storage/              # R2 upload helper
│   └── audio/                # FFmpeg helpers
└── types/                    # TypeScript types
```

---

## Adding Audio Previews

Place short MP3 clips (5–10s) in `public/audio/previews/`:
- `travel-vlog.mp3`
- `tiktok-hook.mp3`
- `podcast-bg.mp3`
- `gaming-montage.mp3`
- `cinematic.mp3`
- `dynamic.mp3`

---

## Next Steps (Phases 4–7)

- [ ] **Phase 4**: Supabase auth + onboarding (email/password, platform quiz)
- [ ] **Phase 5**: Stripe subscriptions + token purchases
- [ ] **Phase 6**: Real FFmpeg processing (trim, fade, SFX merge)
- [ ] **Phase 7**: Share links + viral loop, analytics

---

## Deployment (Vercel)

```bash
# Push to GitHub, then connect to Vercel
vercel --prod
```

Add all `.env.local` variables in the Vercel dashboard under Project Settings → Environment Variables.
