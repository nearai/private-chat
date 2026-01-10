# NEAR AI Private Chat

<div align="center">

**End-to-end encrypted. Verified for private execution.**

[![License: PolyForm Strict License 1.0.0](https://img.shields.io/badge/License-PolyForm%20Strict%201.0.0-blue.svg)](https://github.com/nearai/private-chat/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://react.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-2.5-FFC131.svg)](https://tauri.app/)

</div>

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Building](#building)
- [How NEAR Does Privacy Differently](#how-near-does-privacy-differently)
- [Contributing](#contributing)
- [License](#license)

## 🎯 About

NEAR AI Private Chat is a secure, privacy-focused AI chat application that lets you chat privately with the open-source models you already know and love from providers like OpenAI and DeepSeek. Built with modern web technologies and NEAR blockchain integration, it provides the AI chat experience you already know and love, with the privacy and peace of mind you deserve.

**End-to-end encrypted. Verified for private execution.**

### Why It Matters

- **Privacy First**: Your conversations stay private and secure
- **Trusted Execution**: Runs models in Trusted Execution Environments (TEEs)
- **Your Data Stays Yours**: Model providers, cloud providers, and NEAR can't see, mine, or use your data to train models
- **Blockchain Integration**: Leverages NEAR blockchain for authentication and transactions
- **Cross-Platform**: Available as both web app (PWA) and desktop application
- **Open Source**: Transparent, auditable codebase

> Learn more about NEAR AI Private Chat at [near.ai/private-chat](https://near.ai/private-chat)

## ✨ Features

### Privacy & Security
- 🔒 **End-to-End Encryption** - Your conversations are encrypted end-to-end
- 🛡️ **Trusted Execution Environments (TEEs)** - Models run in encrypted secure areas inside CPU/GPU
- ✅ **Verifiable Execution** - Code and data inside TEEs cannot be tampered with; you can verify the TEE is genuine
- 🔐 **Data Privacy** - Data inside TEEs cannot be seen by the host OS and other apps
- 🚫 **No Data Mining** - Your data remains yours; model providers, cloud providers, and NEAR can't see, mine, or use your data

### Application Features
- 🔐 **Secure Authentication** - Multiple auth methods including API keys, LDAP, and OAuth providers
- 💬 **AI Chat Interface** - Clean, modern chat UI with markdown support
- 🤖 **Multiple Model Support** - Works with models from providers like OpenAI and DeepSeek
- 🌐 **NEAR Integration** - Seamless blockchain authentication and balance checking
- 📱 **Progressive Web App** - Installable PWA with offline capabilities
- 🖥️ **Desktop App** - Native desktop application built with Tauri
- 👥 **Admin Panel** - User and settings management for administrators
- 🌍 **Internationalization** - Multi-language support
- 📊 **Analytics** - Optional PostHog integration for usage analytics
- 🔄 **Auto Updates** - Automatic updates for desktop application

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **React Router** - Routing

### Desktop
- **Tauri 2.5** - Desktop app framework
- **Rust** - Backend runtime

### Additional Libraries
- **CodeMirror 6** - Code editor component
- **Marked** - Markdown parsing
- **KaTeX** - Math rendering
- **Highlight.js** - Code syntax highlighting
- **Axios** - HTTP client
- **i18next** - Internationalization

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v10.24.0 or higher) - Package manager
- **Rust** (latest stable) - For Tauri desktop builds
- **System Dependencies** (for Tauri):
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - **Windows**: Microsoft Visual Studio C++ Build Tools

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nearai/private-chat.git
   cd private-chat
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration (see [Configuration](#configuration) section).

4. **Run the development server**
   ```bash
   pnpm dev
   ```
   
   The app will be available at `http://localhost:3000`

## ⚙️ Configuration

Create a `.env` file in the root directory based on `.env.example`. Here are the available environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_CHAT_API_URL` | Base URL for the chat API | `https://private.near.ai` |
| `VITE_DEPRECATED_API_URL` | Legacy API URL (deprecated) | `https://private-chat-legacy.near.ai` |
| `VITE_PUBLIC_POSTHOG_KEY` | PostHog analytics key | (empty) |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog analytics host | (empty) |
| `VITE_DEFAULT_MODEL` | Default AI model to use | `zai-org/GLM-4.6` |
| `VITE_MODEL_FOR_TITLE_GENERATION` | Model for generating chat titles | `Qwen/Qwen3-30B-A3B-Instruct-2507` |
| `VITE_NEAR_RPC_URL` | NEAR blockchain RPC endpoint | `https://free.rpc.fastnear.com` |

### Example `.env` file:
```env
VITE_CHAT_API_URL=https://private.near.ai
VITE_PUBLIC_POSTHOG_KEY=your-posthog-key
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com
VITE_DEFAULT_MODEL=zai-org/GLM-4.6
VITE_MODEL_FOR_TITLE_GENERATION=Qwen/Qwen3-30B-A3B-Instruct-2507
VITE_NEAR_RPC_URL=https://free.rpc.fastnear.com
```

## 💻 Usage

### Web Application

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Sign in or sign up to start chatting

### Desktop Application

1. Run the Tauri development version:
   ```bash
   pnpm tauri:dev
   ```

2. Build the desktop application:
   ```bash
   pnpm tauri:build
   ```

   The built application will be in `src-tauri/target/release/`

## 🔧 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server on port 3000 |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run linter and type checking |
| `pnpm format` | Format code with Biome |
| `pnpm tauri:dev` | Run Tauri development mode |
| `pnpm tauri:build` | Build Tauri desktop application |

### Code Quality

This project uses:
- **Biome** - Fast linter and formatter
- **TypeScript** - Type checking
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

Code is automatically formatted and linted on commit.

### Project Structure

```
private-chat/
├── src/                    # Frontend source code
│   ├── api/               # API clients and queries
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── pages/             # Page components
│   ├── stores/           # Zustand state stores
│   ├── lib/              # Utility libraries
│   └── types/            # TypeScript type definitions
├── src-tauri/            # Tauri backend (Rust)
├── public/               # Static assets
└── dist/                 # Build output
```

## 🏗️ Building

### Web Build

```bash
pnpm build
```

Output will be in the `dist/` directory.

### Desktop Build

```bash
pnpm tauri:build
```

This will create platform-specific installers:
- **macOS**: `.dmg` file
- **Windows**: `.msi` installer
- **Linux**: `.AppImage` or `.deb` package

Build artifacts are located in `src-tauri/target/release/`

## 🔐 How NEAR Does Privacy Differently

NEAR AI Private Chat leverages **Trusted Execution Environments (TEEs)** to provide unparalleled privacy and security for your AI conversations.

### Private
NEAR runs the models you already know and love in Trusted Execution Environments (TEEs). These are encrypted secure areas inside a CPU/GPU that run code and process data in isolation.

### Secure
TEEs are an encrypted secure area inside a CPU/GPU that runs code and processes data in isolation. **Data inside the TEE cannot be seen by the host OS and other apps.**

### Verifiable
Code and data inside the TEE cannot be tampered with. **You can verify that the TEE is genuine and running expected code.**

### Yours
**Your data remains yours.** Model providers, Cloud providers, and NEAR can't see, mine, or use your data to train models.

> For more information about NEAR AI's privacy technology, visit [near.ai/private-chat](https://near.ai/private-chat)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

4. **Commit your changes**
   ```bash
   git commit -m "Add: your feature description"
   ```
   
   Note: Code is automatically linted and formatted on commit.

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure all tests pass
- Update README if adding new features

## 📄 License

This project is licensed under the **PolyForm Strict License 1.0.0** - see the [LICENSE](https://github.com/nearai/private-chat/blob/main/LICENSE) file for details.

**Copyright (c) 2025 NEAR AI**

The PolyForm Strict License is a noncommercial license that allows use for:
- Personal, noncommercial purposes
- Research, education, and testing
- Charitable organizations and educational institutions
- Government institutions

For more information about the license terms, visit [PolyForm Project](https://polyformproject.org/licenses/strict/1.0.0).

## 🔗 Links

- [NEAR AI Private Chat](https://near.ai/private-chat) - Official website
- [NEAR Protocol](https://near.org/)
- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)

## 📞 Support

For issues, questions, or contributions, please open an issue on the [GitHub repository](https://github.com/nearai/private-chat).

---

<div align="center">

Made with ❤️ by the NEAR AI team

</div>
