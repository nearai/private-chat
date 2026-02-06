# NEAR AI Private Chat

A private chat application built with React, TypeScript, and Tauri. Available as both a web application and a desktop application.

## Backend

This frontend application connects to the chat API backend. For backend setup and documentation, please refer to:

**Backend Repository:** [https://github.com/nearai/chat-api](https://github.com/nearai/chat-api)

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
