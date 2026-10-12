# NEAR AI Private Chat

A private chat application built with React, TypeScript, and Tauri. Available as both a web application and a desktop application.

## Backend

This frontend application connects to the chat API backend. For backend setup and documentation, please refer to:

**Backend Repository:** [https://github.com/nearai/chat-api](https://github.com/nearai/chat-api)

## Authentication backend compatibility

Google/GitHub sign-in requests the chat-api PKCE callback implementation
(nearai/chat-api#408): `frontend_response_mode=code`, S256 challenges, and
`POST /v1/auth/exchange`. Like private-assistant, this frontend accepts legacy
query/fragment bearer callbacks during rolling upgrades. Credentials are removed
from the address bar before analytics/support scripts start and passed in memory.
Legacy servers still expose the bearer in the initial redirect URL; deploy the
PKCE backend to stop that URL transport.

Sessions are owned by the Zustand user store. Login and logout credential changes
share a Web Lock where supported; only the user profile is persisted in the store
record. Token and session ID remain in their existing dedicated storage keys.
Logout preserves credentials written by a newer login in another tab.

Sign-out always calls `POST /v1/auth/logout`, including when the stored session ID
is missing. The updated backend derives the revoked session from the bearer token
(nearai/chat-api#409). Failed revocation keeps local credentials for retry.
Session expiration and idle timeout remain backend policy.

Desktop OAuth keeps the PKCE verifier in the initiating webview. Modern code/state
callbacks are exchanged there; legacy bearer GET callbacks are accepted only while
an active desktop login is awaiting completion. Desktop NEAR sign-in posts
credentials in a form body to the exact loopback callback and checks its state.
The hosted `/near-login` page also supports old desktop clients that send a UUID
`oauth_channel` without `state`: it returns the legacy bearer GET callback to the
same validated loopback address and preserves the channel. Updating the hosted
frontend restores NEAR login for those clients without a desktop reinstall.
An empty, invalid, or duplicated state never falls back to the legacy protocol.
This transitional branch still exposes the bearer in the callback URL; upgrading
the desktop client is required to use POST and the updated local logout logic.
Existing backend callback-origin validation must allow the desktop loopback origin.

## Prerequisites

- **Node.js** (v24 or higher)
- **pnpm** (v10.24.0 or higher) - This project uses pnpm as the package manager
- **Rust** (latest stable) - Required for building the desktop app
- **System dependencies for Tauri:**
  - **macOS:** Xcode Command Line Tools
  - **Linux:** `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - **Windows:** Microsoft C++ Build Tools, WebView2

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd private-chat
```

2. Install dependencies:
```bash
pnpm install
```

## Development

### Web Application

To run the web application in development mode:

```bash
pnpm dev
```

This will start the development server on `http://localhost:3000`.

### Desktop Application

To run the desktop application in development mode:

```bash
pnpm tauri:dev
```

This will:
- Start the Vite dev server for the frontend
- Build and run the Tauri desktop application
- Enable hot-reload for both frontend and backend changes

## Building

### Web Application

To build the web application for production:

```bash
pnpm build
```

The built files will be in the `dist/` directory, ready to be deployed to any static hosting service.

To preview the production build locally:

```bash
pnpm preview
```

### Desktop Application

To build the desktop application:

```bash
pnpm tauri:build
```

This will:
- Build the frontend production bundle
- Compile the Rust backend
- Create platform-specific installers:
  - **macOS:** `.app` bundle and `.dmg` installer
  - **Windows:** `.msi` installer
  - **Linux:** `.AppImage`, `.deb`, or `.rpm` (depending on configuration)

The built artifacts will be in `src-tauri/target/release/bundle/`.

## Environment Variables

The following environment variables can be configured (optional):

- `VITE_CHAT_API_URL` - Backend API URL (default: `https://private.near.ai`)
- `VITE_DEPRECATED_API_URL` - Legacy API URL (default: `https://private-chat-legacy.near.ai`)
- `VITE_PUBLIC_POSTHOG_KEY` - PostHog analytics key
- `VITE_PUBLIC_POSTHOG_HOST` - PostHog host URL
- `VITE_DEFAULT_MODEL` - Default AI model (default: `zai-org/GLM-4.6`)
- `VITE_NEAR_RPC_URL` - NEAR RPC endpoint (default: `https://free.rpc.fastnear.com`)

Create a `.env` file in the root directory to set these variables:

```env
VITE_CHAT_API_URL=http://localhost:8080
VITE_PUBLIC_POSTHOG_KEY=your-posthog-key
```

## Available Scripts

- `pnpm dev` - Start web development server
- `pnpm build` - Build web application for production
- `pnpm preview` - Preview production build locally
- `pnpm tauri:dev` - Run desktop app in development mode
- `pnpm tauri:build` - Build desktop app for production
- `pnpm tauri` - Run Tauri CLI commands
- `pnpm lint` - Run type checking and linting
- `pnpm format` - Format code with Biome
- `pnpm typecheck` - Run TypeScript type checking

## Project Structure

```
private-chat/
├── src/                    # Frontend source code
│   ├── api/               # API clients and queries
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── stores/            # Zustand state stores
│   └── ...
├── src-tauri/             # Tauri backend (Rust)
│   ├── src/              # Rust source code
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── public/                # Static assets
└── dist/                  # Production build output
```

## Technology Stack

- **Frontend:**
  - React 19
  - TypeScript
  - Vite
  - Tailwind CSS
  - Zustand (state management)
  - React Query (data fetching)
  - Radix UI (component library)

- **Desktop:**
  - Tauri 2.x
  - Rust

## License

See [LICENSE](LICENSE) file for details.
