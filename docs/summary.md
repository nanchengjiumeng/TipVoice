# Tip Voice - Chrome Extension

A Chrome extension that converts selected text to speech using Volcengine (火山引擎) TTS V3 Streaming API.

## Architecture

```
Content Script (any webpage)         Background Service Worker
┌──────────────────────────┐        ┌─────────────────────────┐
│ Selection Detection      │        │ chrome.runtime.onMessage │
│         ↓                │        │         ↓                │
│ Floating Button (Shadow) │──msg──→│ TTS Client (V3 stream)  │──→ Volcengine V3 API
│         ↓                │←─msg───│         ↓                │    POST /api/v3/tts/unidirectional
│ State (loading/playing)  │        │ Audio chunks → offscreen │
└──────────────────────────┘        └─────────────────────────┘

Offscreen Document                   Popup (React)
┌──────────────────────────┐        ┌──────────────────────────┐
│ MediaSource streaming    │        │ Settings Form            │──→ chrome.storage.sync
│ or fallback blob playback│        │ (apiKey, voice, rate...) │
└──────────────────────────┘        └──────────────────────────┘
```

- **V3 streaming**: Binary protocol over HTTP Chunked, audio chunks streamed progressively
- **Offscreen playback**: Audio played in offscreen document to bypass page CSP restrictions
- **MediaSource (mp3)**: Progressive playback via MediaSource API for low-latency audio start
- **Interruption**: AbortController cancels fetch stream mid-request
- **Content script UI**: Native DOM + Shadow DOM, lightweight and style-isolated
- **React only in popup**: Settings UI uses React for form state management

## Project Structure

```
tts-chrome-ext/
├── manifest.json                    # Chrome MV3 manifest
├── popup.html                       # Popup entry HTML
├── offscreen.html                   # Offscreen document for audio playback
├── vite.config.ts                   # Vite+ config with react + webExtension plugins
├── tsconfig.json                    # TypeScript config (jsx, chrome types)
├── public/icons/                    # Extension icons (16/48/128 PNG)
├── src/
│   ├── shared/
│   │   ├── types.ts                 # TypeScript interfaces (TTSSettings, messages)
│   │   ├── constants.ts             # V3 API URL, defaults, voice presets, resource IDs
│   │   ├── storage.ts               # chrome.storage.sync typed wrapper
│   │   └── messages.ts              # Message protocol types + helpers
│   ├── lib/
│   │   └── tts-client.ts            # V3 binary protocol: frame builder, stream parser, synthesizeStream()
│   ├── background/
│   │   └── index.ts                 # Service worker: message handler, stream orchestration, offscreen lifecycle
│   ├── offscreen/
│   │   └── index.ts                 # MediaSource streaming playback + blob fallback
│   ├── content/
│   │   ├── index.ts                 # Selection detection + state management
│   │   ├── floating-button.ts       # Shadow DOM floating speaker button
│   │   └── styles.css               # Shadow DOM scoped styles
│   └── popup/
│       ├── main.tsx                 # React entry
│       ├── App.tsx                  # Root component
│       ├── components/
│       │   ├── CredentialsSection.tsx  # API Key + Resource ID
│       │   ├── VoiceSettings.tsx       # Voice type, speech rate, loudness
│       │   └── AudioSettings.tsx       # Audio encoding format
│       ├── hooks/
│       │   └── useSettings.ts       # Load/save settings hook
│       └── popup.css
└── tests/
    ├── setup.ts                     # Chrome API mock
    ├── tts-client.test.ts           # V3 binary protocol + streaming tests
    ├── storage.test.ts
    └── messages.test.ts
```

## Core Files

- `src/lib/tts-client.ts` — V3 binary protocol implementation: frame construction, BinaryFrameParser for streaming response, `synthesizeStream()` with audio chunk callback
- `src/background/index.ts` — Service Worker: validates credentials, initiates V3 stream, forwards audio chunks to offscreen, manages per-tab AbortController
- `src/offscreen/index.ts` — Audio playback: MediaSource API for mp3 progressive playback, fallback to blob accumulation for other formats
- `src/content/index.ts` — Text selection detection, floating button lifecycle, state transitions via AUDIO_STATE messages
- `src/content/floating-button.ts` — Shadow DOM isolated button with 4 states (idle/loading/playing/error)
- `src/popup/App.tsx` — React settings form (API Key, resource ID, voice, speech rate, loudness, encoding)

## Development

```bash
# Install dependencies
vp install

# Run checks (format + lint + typecheck)
vp check

# Run unit tests
vp test

# Build for production
vp build
```

## Usage

1. Run `vp build`
2. Open Chrome -> `chrome://extensions` -> Enable Developer Mode
3. Click "Load unpacked" -> select the `dist/` directory
4. Click the extension icon -> configure **API Key** from Volcengine console
5. Select text on any webpage -> click the floating speaker button -> hear TTS audio

## Volcengine TTS V3 API

- **Endpoint**: `POST https://openspeech.bytedance.com/api/v3/tts/unidirectional`
- **Auth**: `X-Api-Key` header (from Volcengine new console)
- **Protocol**: Binary frames (4-byte header + event + payload size + payload)
- **Response**: Streamed audio chunks (AudioOnlyResponse 0xB) + server events (FullServerResponse 0x9)
- **Resource IDs**: `seed-tts-2.0`, `seed-tts-1.0`, `seed-tts-1.0-concurr`

## Testing

- 19 unit tests covering storage, messages, and V3 TTS client (binary protocol, streaming, error handling)
- Chrome APIs mocked in `tests/setup.ts`
- Manual integration testing via Chrome extension load
