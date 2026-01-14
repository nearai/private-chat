# Screen Capture & Audio Recording Implementation Plan

## Overview

This document outlines the implementation plan for adding screen grabbing and audio recording capabilities to the private-chat application in desktop mode. These features will enable users to capture visual and audio context that can be processed and used as AI conversation context.

---

## Table of Contents

1. [Feature Requirements](#1-feature-requirements)
2. [Architecture Overview](#2-architecture-overview)
3. [Browser APIs & Libraries](#3-browser-apis--libraries)
4. [Component Architecture](#4-component-architecture)
5. [State Management](#5-state-management)
6. [Processing Pipeline](#6-processing-pipeline)
7. [AI Context Integration](#7-ai-context-integration)
8. [Desktop (Tauri) Considerations](#8-desktop-tauri-considerations)
9. [Security & Permissions](#9-security--permissions)
10. [Implementation Phases](#10-implementation-phases)
11. [File Structure](#11-file-structure)
12. [API Contracts](#12-api-contracts)
13. [UI/UX Design](#13-uiux-design)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Feature Requirements

### 1.1 Screen Capture
- **Screenshot**: Capture current screen or window as image
- **Screen Recording**: Record screen activity as video (with optional duration limits)
- **Window Selection**: Allow user to select specific window or entire screen
- **Region Selection**: Optional cropping/region selection for screenshots
- **Tab Audio**: Capture system/tab audio during screen recording

### 1.2 Audio Recording
- **Microphone Recording**: Record user's voice via microphone
- **System Audio**: Capture system audio output (desktop mode)
- **Mixed Audio**: Combine microphone + system audio
- **Audio Visualization**: Real-time waveform/level indicator during recording

### 1.3 Processing & Analysis
- **Transcription**: Convert audio to text via speech-to-text
- **Image Analysis**: Send screenshots for visual AI analysis
- **Video Frame Extraction**: Extract key frames from recordings
- **Context Summarization**: Generate AI-friendly context from captures

### 1.4 AI Context Integration
- **Inline Attachment**: Attach captures directly to messages
- **Background Context**: Use captures as persistent conversation context
- **Multi-modal Input**: Combine text, audio, and visual inputs

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Interface                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ ScreenCapture   │  │ AudioRecorder   │  │ CapturePreview          │  │
│  │ Controls        │  │ Controls        │  │ Component               │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           ▼                    ▼                        ▼               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MediaCapture Service Layer                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │ Screen      │  │ Audio       │  │ Recording               │  │   │
│  │  │ Manager     │  │ Manager     │  │ Store (Zustand)         │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                         Processing Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Audio           │  │ Image           │  │ Video                   │  │
│  │ Processor       │  │ Processor       │  │ Processor               │  │
│  │ (Transcription) │  │ (Compression)   │  │ (Frame Extraction)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                           API Layer                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      ChatClient Extensions                       │   │
│  │  - uploadRecording()  - uploadScreenshot()  - transcribeAudio() │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                      Tauri Native Layer (Desktop)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ System Audio    │  │ Window          │  │ Native                  │  │
│  │ Capture Plugin  │  │ Enumeration     │  │ Notifications           │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Browser APIs & Libraries

### 3.1 Core Browser APIs

#### MediaDevices API (Audio Recording)
```typescript
// Microphone access
navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100,
    channelCount: 1
  }
});
```

#### Screen Capture API (Screen Recording)
```typescript
// Screen/window capture
navigator.mediaDevices.getDisplayMedia({
  video: {
    displaySurface: 'monitor' | 'window' | 'browser',
    frameRate: { ideal: 30, max: 60 },
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  },
  audio: true, // System audio (limited browser support)
  selfBrowserSurface: 'include',
  systemAudio: 'include'
});
```

#### MediaRecorder API (Recording)
```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000, // 2.5 Mbps
  audioBitsPerSecond: 128000   // 128 kbps
});
```

#### Canvas API (Screenshots)
```typescript
// For capturing specific elements or processing frames
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.drawImage(videoElement, 0, 0);
canvas.toBlob(callback, 'image/png');
```

### 3.2 Recommended Libraries

| Library | Purpose | Why |
|---------|---------|-----|
| `recordrtc` | Recording wrapper | Simplifies cross-browser MediaRecorder handling |
| `wavesurfer.js` | Audio visualization | Real-time waveform display during recording |
| `browser-image-compression` | Image processing | Compress screenshots before upload |
| `ffmpeg.wasm` | Media processing | Client-side video/audio processing (optional) |
| `lamejs` | MP3 encoding | Convert audio to MP3 for smaller file sizes |

### 3.3 Installation
```bash
pnpm add recordrtc wavesurfer.js browser-image-compression
pnpm add -D @types/recordrtc
```

---

## 4. Component Architecture

### 4.1 Component Hierarchy

```
MessageInput (existing)
├── RecordingControls (new)
│   ├── ScreenCaptureButton
│   │   ├── ScreenshotOption
│   │   ├── ScreenRecordOption
│   │   └── WindowSelectDropdown
│   ├── AudioRecordButton
│   │   ├── MicrophoneSelector
│   │   └── AudioLevelIndicator
│   └── RecordingTimer
├── CapturePreviewPanel (new)
│   ├── ScreenshotPreview
│   ├── VideoPreview
│   ├── AudioPreview
│   │   └── WaveformDisplay
│   └── TranscriptionPreview
└── AttachedCaptures (new, extends existing file attachments)
    ├── CaptureChip
    └── RemoveButton
```

### 4.2 Component Specifications

#### RecordingControls.tsx
```typescript
interface RecordingControlsProps {
  onScreenshot: () => void;
  onStartScreenRecording: () => void;
  onStopScreenRecording: () => void;
  onStartAudioRecording: () => void;
  onStopAudioRecording: () => void;
  isScreenRecording: boolean;
  isAudioRecording: boolean;
  recordingDuration: number;
  disabled?: boolean;
}
```

#### ScreenCaptureButton.tsx
```typescript
interface ScreenCaptureProps {
  onCapture: (type: 'screenshot' | 'recording') => void;
  onWindowSelect: (windowId: string) => void;
  availableWindows: WindowInfo[];
  captureMode: 'screen' | 'window' | 'region';
  isRecording: boolean;
}
```

#### AudioRecordButton.tsx
```typescript
interface AudioRecordProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number; // 0-1 for visualization
  selectedDevice: string;
  availableDevices: MediaDeviceInfo[];
  onDeviceSelect: (deviceId: string) => void;
}
```

#### CapturePreview.tsx
```typescript
interface CapturePreviewProps {
  capture: CaptureItem;
  onRemove: () => void;
  onRetake: () => void;
  onEdit?: () => void; // For cropping screenshots
  showTranscription?: boolean;
}

type CaptureItem =
  | ScreenshotCapture
  | ScreenRecordingCapture
  | AudioRecordingCapture;

interface ScreenshotCapture {
  type: 'screenshot';
  blob: Blob;
  dataUrl: string;
  timestamp: number;
  dimensions: { width: number; height: number };
}

interface ScreenRecordingCapture {
  type: 'screen_recording';
  blob: Blob;
  duration: number;
  timestamp: number;
  hasAudio: boolean;
}

interface AudioRecordingCapture {
  type: 'audio_recording';
  blob: Blob;
  duration: number;
  timestamp: number;
  transcription?: string;
  waveformData?: number[];
}
```

---

## 5. State Management

### 5.1 Recording Store (useRecordingStore.ts)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface RecordingState {
  // Screen capture state
  isScreenRecording: boolean;
  screenRecordingStartTime: number | null;
  screenStream: MediaStream | null;
  selectedDisplaySurface: 'monitor' | 'window' | 'browser';

  // Audio recording state
  isAudioRecording: boolean;
  audioRecordingStartTime: number | null;
  audioStream: MediaStream | null;
  selectedAudioDevice: string | null;
  audioLevel: number;

  // Captured items pending attachment
  pendingCaptures: CaptureItem[];

  // Permissions state
  permissions: {
    microphone: PermissionState | null;
    screen: PermissionState | null;
  };

  // Device enumeration
  availableAudioDevices: MediaDeviceInfo[];
  availableVideoDevices: MediaDeviceInfo[];

  // Settings
  settings: {
    includeSystemAudio: boolean;
    includeTabAudio: boolean;
    audioQuality: 'low' | 'medium' | 'high';
    videoQuality: 'low' | 'medium' | 'high';
    maxRecordingDuration: number; // seconds
    autoTranscribe: boolean;
  };
}

interface RecordingActions {
  // Screen capture actions
  startScreenRecording: (options?: ScreenRecordingOptions) => Promise<void>;
  stopScreenRecording: () => Promise<Blob>;
  takeScreenshot: () => Promise<Blob>;

  // Audio recording actions
  startAudioRecording: (deviceId?: string) => Promise<void>;
  stopAudioRecording: () => Promise<Blob>;
  pauseAudioRecording: () => void;
  resumeAudioRecording: () => void;

  // Capture management
  addCapture: (capture: CaptureItem) => void;
  removeCapture: (index: number) => void;
  clearCaptures: () => void;

  // Device management
  enumerateDevices: () => Promise<void>;
  selectAudioDevice: (deviceId: string) => void;

  // Permission handling
  requestMicrophonePermission: () => Promise<boolean>;
  requestScreenPermission: () => Promise<boolean>;
  checkPermissions: () => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<RecordingState['settings']>) => void;

  // Cleanup
  cleanup: () => void;
}

type RecordingStore = RecordingState & RecordingActions;
```

### 5.2 Store Implementation

```typescript
// src/stores/useRecordingStore.ts
export const useRecordingStore = create<RecordingStore>()(
  immer((set, get) => ({
    // Initial state
    isScreenRecording: false,
    screenRecordingStartTime: null,
    screenStream: null,
    selectedDisplaySurface: 'monitor',

    isAudioRecording: false,
    audioRecordingStartTime: null,
    audioStream: null,
    selectedAudioDevice: null,
    audioLevel: 0,

    pendingCaptures: [],

    permissions: {
      microphone: null,
      screen: null,
    },

    availableAudioDevices: [],
    availableVideoDevices: [],

    settings: {
      includeSystemAudio: true,
      includeTabAudio: true,
      audioQuality: 'medium',
      videoQuality: 'medium',
      maxRecordingDuration: 300, // 5 minutes
      autoTranscribe: true,
    },

    // Actions implementation...
    startScreenRecording: async (options) => {
      // Implementation
    },
    // ... other actions
  }))
);
```

### 5.3 Integration with Existing Stores

```typescript
// Extend useChatStore for capture-related chat state
interface ChatStoreExtensions {
  attachedCaptures: CaptureItem[];
  addCaptureToMessage: (capture: CaptureItem) => void;
  removeCaptureFromMessage: (index: number) => void;
}

// Integration in useSettingsStore
interface SettingsExtensions {
  recording: {
    defaultAudioDevice: string | null;
    defaultVideoQuality: 'low' | 'medium' | 'high';
    autoTranscribe: boolean;
    transcriptionLanguage: string;
  };
}
```

---

## 6. Processing Pipeline

### 6.1 Audio Processing

```typescript
// src/lib/media/audio-processor.ts

interface AudioProcessingOptions {
  format: 'webm' | 'mp3' | 'wav';
  sampleRate: number;
  channels: 1 | 2;
  bitrate: number;
}

class AudioProcessor {
  /**
   * Convert audio blob to target format
   */
  async convertFormat(
    blob: Blob,
    targetFormat: 'mp3' | 'wav'
  ): Promise<Blob>;

  /**
   * Compress audio while maintaining quality
   */
  async compress(blob: Blob, quality: 'low' | 'medium' | 'high'): Promise<Blob>;

  /**
   * Extract waveform data for visualization
   */
  async extractWaveform(blob: Blob, samples: number): Promise<number[]>;

  /**
   * Trim silence from beginning/end
   */
  async trimSilence(
    blob: Blob,
    threshold: number
  ): Promise<Blob>;

  /**
   * Split audio into chunks for streaming transcription
   */
  async chunk(
    blob: Blob,
    chunkDurationMs: number
  ): Promise<Blob[]>;
}
```

### 6.2 Image Processing

```typescript
// src/lib/media/image-processor.ts

interface ImageProcessingOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  format: 'png' | 'jpeg' | 'webp';
}

class ImageProcessor {
  /**
   * Compress and resize screenshot
   */
  async compress(
    blob: Blob,
    options: ImageProcessingOptions
  ): Promise<Blob>;

  /**
   * Crop image to region
   */
  async crop(
    blob: Blob,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<Blob>;

  /**
   * Convert to base64 for preview
   */
  async toDataUrl(blob: Blob): Promise<string>;

  /**
   * Extract text regions using OCR preprocessing
   */
  async preprocessForOCR(blob: Blob): Promise<Blob>;
}
```

### 6.3 Video Processing

```typescript
// src/lib/media/video-processor.ts

interface VideoProcessingOptions {
  maxDuration: number; // seconds
  frameRate: number;
  resolution: '720p' | '1080p' | '4k';
  codec: 'vp8' | 'vp9' | 'h264';
}

class VideoProcessor {
  /**
   * Extract key frames from video
   */
  async extractFrames(
    blob: Blob,
    interval: number // seconds between frames
  ): Promise<Blob[]>;

  /**
   * Compress video
   */
  async compress(
    blob: Blob,
    options: VideoProcessingOptions
  ): Promise<Blob>;

  /**
   * Get video metadata
   */
  async getMetadata(blob: Blob): Promise<{
    duration: number;
    width: number;
    height: number;
    frameRate: number;
  }>;

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(
    blob: Blob,
    timestamp: number
  ): Promise<Blob>;

  /**
   * Extract audio track only
   */
  async extractAudio(blob: Blob): Promise<Blob>;
}
```

---

## 7. AI Context Integration

### 7.1 Content Types Extension

```typescript
// Extend types/openai.ts

type CaptureContentItem =
  | ScreenshotContentItem
  | ScreenRecordingContentItem
  | AudioRecordingContentItem;

interface ScreenshotContentItem {
  type: 'input_screenshot';
  id: string;
  name: string;
  image_url: string;
  dimensions: { width: number; height: number };
  timestamp: number;
}

interface ScreenRecordingContentItem {
  type: 'input_screen_recording';
  id: string;
  name: string;
  duration: number;
  has_audio: boolean;
  thumbnail_url?: string;
  extracted_frames?: string[]; // URLs to key frames
  timestamp: number;
}

interface AudioRecordingContentItem {
  type: 'input_audio_recording';
  id: string;
  name: string;
  duration: number;
  transcription?: string;
  timestamp: number;
}

// Update FileContentItem union
type FileContentItem =
  | { type: "input_audio"; id: string; name: string }
  | { type: "input_file"; id: string; name: string }
  | { type: "input_image"; id: string; name: string; image_url: string }
  | ScreenshotContentItem
  | ScreenRecordingContentItem
  | AudioRecordingContentItem;
```

### 7.2 Context Building

```typescript
// src/lib/media/context-builder.ts

interface CaptureContext {
  type: 'screenshot' | 'screen_recording' | 'audio_recording';
  summary: string;
  details: Record<string, unknown>;
}

class CaptureContextBuilder {
  /**
   * Build AI-consumable context from screenshot
   */
  async buildScreenshotContext(
    screenshot: ScreenshotCapture
  ): Promise<CaptureContext> {
    return {
      type: 'screenshot',
      summary: `Screenshot captured at ${formatTimestamp(screenshot.timestamp)}`,
      details: {
        dimensions: screenshot.dimensions,
        // Could include OCR text in future
      }
    };
  }

  /**
   * Build context from screen recording
   */
  async buildScreenRecordingContext(
    recording: ScreenRecordingCapture,
    options: { includeFrames: boolean; frameInterval: number }
  ): Promise<CaptureContext> {
    const frames = options.includeFrames
      ? await videoProcessor.extractFrames(recording.blob, options.frameInterval)
      : [];

    return {
      type: 'screen_recording',
      summary: `Screen recording (${formatDuration(recording.duration)})`,
      details: {
        duration: recording.duration,
        hasAudio: recording.hasAudio,
        keyFrames: frames.length,
      }
    };
  }

  /**
   * Build context from audio recording with transcription
   */
  async buildAudioContext(
    recording: AudioRecordingCapture
  ): Promise<CaptureContext> {
    const transcription = recording.transcription
      || await this.transcribe(recording.blob);

    return {
      type: 'audio_recording',
      summary: `Audio recording (${formatDuration(recording.duration)})`,
      details: {
        duration: recording.duration,
        transcription,
      }
    };
  }

  /**
   * Transcribe audio using API
   */
  private async transcribe(audioBlob: Blob): Promise<string> {
    // Call transcription API
    const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const response = await chatClient.transcribeAudio(file);
    return response.text;
  }
}
```

### 7.3 Message Composition

```typescript
// Integration in MessageInput.tsx

async function handleSendWithCaptures(
  text: string,
  captures: CaptureItem[]
) {
  const contentItems: ContentItem[] = [];

  // Add text content
  if (text.trim()) {
    contentItems.push({ type: 'input_text', text });
  }

  // Process and add captures
  for (const capture of captures) {
    switch (capture.type) {
      case 'screenshot': {
        const compressed = await imageProcessor.compress(capture.blob, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.9,
          format: 'jpeg'
        });
        const uploaded = await chatClient.uploadScreenshot(compressed);
        contentItems.push({
          type: 'input_screenshot',
          id: uploaded.id,
          name: uploaded.filename,
          image_url: uploaded.url,
          dimensions: capture.dimensions,
          timestamp: capture.timestamp
        });
        break;
      }

      case 'screen_recording': {
        // Extract key frames and upload
        const frames = await videoProcessor.extractFrames(capture.blob, 5);
        const uploaded = await chatClient.uploadRecording(capture.blob, frames);
        contentItems.push({
          type: 'input_screen_recording',
          id: uploaded.id,
          name: uploaded.filename,
          duration: capture.duration,
          has_audio: capture.hasAudio,
          extracted_frames: uploaded.frame_urls,
          timestamp: capture.timestamp
        });
        break;
      }

      case 'audio_recording': {
        // Transcribe and upload
        const transcription = await chatClient.transcribeAudio(capture.blob);
        const uploaded = await chatClient.uploadAudioRecording(capture.blob);
        contentItems.push({
          type: 'input_audio_recording',
          id: uploaded.id,
          name: uploaded.filename,
          duration: capture.duration,
          transcription: transcription.text,
          timestamp: capture.timestamp
        });
        break;
      }
    }
  }

  // Send message with all content items
  await sendMessage(contentItems);
}
```

---

## 8. Desktop (Tauri) Considerations

### 8.1 Tauri Plugin Requirements

For enhanced desktop functionality, consider these Tauri plugins:

```toml
# src-tauri/Cargo.toml additions

[dependencies]
tauri-plugin-global-shortcut = "2.0"  # Hotkeys for capture
tauri-plugin-dialog = "2.0"           # Native file dialogs
tauri-plugin-clipboard-manager = "2.0" # Clipboard for screenshots
```

### 8.2 System Audio Capture (Desktop-specific)

Browser APIs have limited system audio support. For full system audio capture:

```rust
// src-tauri/src/audio.rs

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

#[tauri::command]
pub async fn enumerate_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();
    let devices = host.output_devices()
        .map_err(|e| e.to_string())?
        .filter_map(|d| {
            d.name().ok().map(|name| AudioDevice {
                id: name.clone(),
                name,
                is_default: false,
            })
        })
        .collect();
    Ok(devices)
}

#[tauri::command]
pub async fn start_system_audio_capture(device_id: String) -> Result<(), String> {
    // Platform-specific system audio capture
    // This is complex and may require additional OS permissions
    todo!()
}
```

### 8.3 Window Enumeration (Desktop-specific)

```rust
// src-tauri/src/windows.rs

#[derive(serde::Serialize)]
pub struct WindowInfo {
    id: String,
    title: String,
    app_name: String,
    thumbnail: Option<String>, // Base64 encoded
}

#[tauri::command]
pub async fn enumerate_windows() -> Result<Vec<WindowInfo>, String> {
    // Platform-specific window enumeration
    #[cfg(target_os = "macos")]
    {
        // Use CGWindowListCopyWindowInfo
    }

    #[cfg(target_os = "windows")]
    {
        // Use EnumWindows
    }

    #[cfg(target_os = "linux")]
    {
        // Use X11 or Wayland APIs
    }

    todo!()
}
```

### 8.4 Global Hotkeys

```typescript
// src/hooks/useGlobalHotkeys.ts

import { register, unregister } from '@tauri-apps/plugin-global-shortcut';

const DEFAULT_HOTKEYS = {
  screenshot: 'CommandOrControl+Shift+S',
  startRecording: 'CommandOrControl+Shift+R',
  stopRecording: 'CommandOrControl+Shift+X',
};

export function useGlobalHotkeys() {
  const { takeScreenshot, startScreenRecording, stopScreenRecording } =
    useRecordingStore();

  useEffect(() => {
    if (!isTauri()) return;

    const registerHotkeys = async () => {
      await register(DEFAULT_HOTKEYS.screenshot, takeScreenshot);
      await register(DEFAULT_HOTKEYS.startRecording, startScreenRecording);
      await register(DEFAULT_HOTKEYS.stopRecording, stopScreenRecording);
    };

    registerHotkeys();

    return () => {
      unregister(DEFAULT_HOTKEYS.screenshot);
      unregister(DEFAULT_HOTKEYS.startRecording);
      unregister(DEFAULT_HOTKEYS.stopRecording);
    };
  }, []);
}
```

### 8.5 Desktop vs Web Feature Detection

```typescript
// src/lib/platform.ts

export const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window;
};

export const platformCapabilities = {
  systemAudioCapture: isTauri(),
  windowEnumeration: isTauri(),
  globalHotkeys: isTauri(),
  nativeNotifications: isTauri(),

  // Browser capabilities
  screenCapture: 'getDisplayMedia' in navigator.mediaDevices,
  microphoneCapture: 'getUserMedia' in navigator.mediaDevices,
  mediaRecorder: 'MediaRecorder' in window,
};

export const getAvailableFeatures = () => ({
  screenshot: platformCapabilities.screenCapture,
  screenRecording: platformCapabilities.screenCapture && platformCapabilities.mediaRecorder,
  audioRecording: platformCapabilities.microphoneCapture && platformCapabilities.mediaRecorder,
  systemAudio: platformCapabilities.systemAudioCapture,
  windowSelection: platformCapabilities.windowEnumeration,
  hotkeys: platformCapabilities.globalHotkeys,
});
```

---

## 9. Security & Permissions

### 9.1 Permission Flow

```typescript
// src/lib/permissions.ts

type PermissionType = 'microphone' | 'screen' | 'notifications';

interface PermissionResult {
  granted: boolean;
  state: PermissionState;
  error?: string;
}

export async function requestPermission(
  type: PermissionType
): Promise<PermissionResult> {
  switch (type) {
    case 'microphone':
      return requestMicrophonePermission();
    case 'screen':
      return requestScreenPermission();
    case 'notifications':
      return requestNotificationPermission();
  }
}

async function requestMicrophonePermission(): Promise<PermissionResult> {
  try {
    // Check existing permission
    const status = await navigator.permissions.query({
      name: 'microphone' as PermissionName
    });

    if (status.state === 'granted') {
      return { granted: true, state: 'granted' };
    }

    // Request via getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());

    return { granted: true, state: 'granted' };
  } catch (error) {
    return {
      granted: false,
      state: 'denied',
      error: error instanceof Error ? error.message : 'Permission denied'
    };
  }
}

async function requestScreenPermission(): Promise<PermissionResult> {
  try {
    // Screen capture permission can only be requested via getDisplayMedia
    // The browser will show its own permission UI
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });
    stream.getTracks().forEach(track => track.stop());

    return { granted: true, state: 'granted' };
  } catch (error) {
    return {
      granted: false,
      state: 'denied',
      error: error instanceof Error ? error.message : 'Permission denied'
    };
  }
}
```

### 9.2 Permission UI Component

```typescript
// src/components/common/PermissionRequest.tsx

interface PermissionRequestProps {
  type: 'microphone' | 'screen';
  onGranted: () => void;
  onDenied: () => void;
}

export function PermissionRequest({
  type,
  onGranted,
  onDenied
}: PermissionRequestProps) {
  const [state, setState] = useState<'idle' | 'requesting' | 'denied'>('idle');

  const handleRequest = async () => {
    setState('requesting');
    const result = await requestPermission(type);

    if (result.granted) {
      onGranted();
    } else {
      setState('denied');
      onDenied();
    }
  };

  // Render permission request UI with explanation
  // ...
}
```

### 9.3 User Permission Settings

Leverage existing permission flags in user settings:

```typescript
// Check user has permission for features
const canRecord = useMemo(() => ({
  audio: user?.permissions.chat.stt ?? false,
  screen: user?.permissions.features.image_generation ?? false, // Reuse or add new flag
}), [user]);
```

### 9.4 Data Privacy Considerations

```typescript
// src/lib/media/privacy.ts

interface PrivacyOptions {
  localOnly: boolean;        // Don't upload to server
  autoDelete: boolean;       // Delete after sending
  deleteAfterDays: number;   // Server-side retention
  encryptLocal: boolean;     // Encrypt local storage
}

const DEFAULT_PRIVACY: PrivacyOptions = {
  localOnly: false,
  autoDelete: true,
  deleteAfterDays: 30,
  encryptLocal: false,
};

// Ensure captures are cleaned up properly
export function cleanupCaptures(captures: CaptureItem[]) {
  for (const capture of captures) {
    // Revoke object URLs
    if ('dataUrl' in capture) {
      URL.revokeObjectURL(capture.dataUrl);
    }
    // Clear blob references
    capture.blob = null as unknown as Blob;
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create `useRecordingStore` Zustand store
- [ ] Implement `useMediaRecorder` hook for audio recording
- [ ] Implement `useScreenCapture` hook for screen capture
- [ ] Add type definitions for capture content items
- [ ] Create platform detection utilities
- [ ] Set up permission handling

### Phase 2: Audio Recording (Week 2-3)
- [ ] Implement microphone recording functionality
- [ ] Add audio device enumeration and selection
- [ ] Create audio level visualization component
- [ ] Implement audio processing (compression, format conversion)
- [ ] Add recording timer and controls UI
- [ ] Integrate with message input

### Phase 3: Screen Capture (Week 3-4)
- [ ] Implement screenshot capture
- [ ] Implement screen recording with MediaRecorder
- [ ] Add window/screen selection UI
- [ ] Create screenshot preview and crop functionality
- [ ] Add image compression and processing
- [ ] Integrate with message input

### Phase 4: Processing & AI Integration (Week 4-5)
- [ ] Implement audio transcription integration
- [ ] Add video frame extraction
- [ ] Create context builder for AI consumption
- [ ] Extend ChatClient with capture upload methods
- [ ] Update message rendering for new content types
- [ ] Add capture preview in conversation

### Phase 5: Desktop Enhancements (Week 5-6)
- [ ] Add Tauri plugins for enhanced functionality
- [ ] Implement global hotkeys
- [ ] Add system audio capture (if feasible)
- [ ] Implement window enumeration
- [ ] Add native notifications for recording status
- [ ] Desktop-specific UI optimizations

### Phase 6: Polish & Testing (Week 6-7)
- [ ] Cross-browser testing
- [ ] Desktop (macOS, Windows, Linux) testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation
- [ ] User settings integration

---

## 11. File Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── MessageInput.tsx          # Modify: Add recording controls
│   │   ├── recording/                 # New directory
│   │   │   ├── RecordingControls.tsx
│   │   │   ├── ScreenCaptureButton.tsx
│   │   │   ├── AudioRecordButton.tsx
│   │   │   ├── RecordingTimer.tsx
│   │   │   ├── AudioLevelIndicator.tsx
│   │   │   └── index.ts
│   │   └── preview/                   # New directory
│   │       ├── CapturePreview.tsx
│   │       ├── ScreenshotPreview.tsx
│   │       ├── VideoPreview.tsx
│   │       ├── AudioPreview.tsx
│   │       ├── WaveformDisplay.tsx
│   │       └── index.ts
│   └── common/
│       └── PermissionRequest.tsx      # New file
│
├── hooks/
│   ├── useMediaRecorder.ts            # New: Audio recording hook
│   ├── useScreenCapture.ts            # New: Screen capture hook
│   ├── useAudioLevel.ts               # New: Audio level monitoring
│   ├── useGlobalHotkeys.ts            # New: Desktop hotkeys
│   └── usePermissions.ts              # New: Permission management
│
├── stores/
│   └── useRecordingStore.ts           # New: Recording state management
│
├── lib/
│   ├── media/                         # New directory
│   │   ├── audio-processor.ts
│   │   ├── image-processor.ts
│   │   ├── video-processor.ts
│   │   ├── context-builder.ts
│   │   └── index.ts
│   ├── permissions.ts                 # New: Permission utilities
│   ├── platform.ts                    # New: Platform detection
│   └── constants.ts                   # Modify: Add media constants
│
├── api/
│   └── chat/
│       └── client.ts                  # Modify: Add capture upload methods
│
├── types/
│   ├── openai.ts                      # Modify: Add capture content types
│   └── recording.ts                   # New: Recording-specific types
│
└── styles/
    └── recording.css                  # New: Recording UI styles

src-tauri/
├── src/
│   ├── main.rs                        # Modify: Register new commands
│   ├── audio.rs                       # New: System audio capture
│   └── windows.rs                     # New: Window enumeration
│
├── Cargo.toml                         # Modify: Add plugin dependencies
└── tauri.conf.json                    # Modify: Add permissions
```

---

## 12. API Contracts

### 12.1 New ChatClient Methods

```typescript
// Extend api/chat/client.ts

interface ChatClientExtensions {
  /**
   * Upload screenshot to server
   */
  uploadScreenshot(
    blob: Blob,
    metadata?: { width: number; height: number }
  ): Promise<FileOpenAIResponse>;

  /**
   * Upload screen recording to server
   */
  uploadScreenRecording(
    blob: Blob,
    frames?: Blob[], // Key frames
    metadata?: { duration: number; hasAudio: boolean }
  ): Promise<ScreenRecordingUploadResponse>;

  /**
   * Upload audio recording to server
   */
  uploadAudioRecording(
    blob: Blob,
    metadata?: { duration: number }
  ): Promise<FileOpenAIResponse>;

  /**
   * Transcribe audio file
   */
  transcribeAudio(
    file: File | Blob,
    options?: { language?: string; prompt?: string }
  ): Promise<TranscriptionResponse>;
}

interface ScreenRecordingUploadResponse extends FileOpenAIResponse {
  frame_urls?: string[];
  duration: number;
  has_audio: boolean;
}

interface TranscriptionResponse {
  text: string;
  language: string;
  duration: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}
```

### 12.2 Backend API Requirements

The backend will need to support:

```yaml
# New endpoints needed

POST /api/v2/files/screenshot
  Request: multipart/form-data
    - file: Blob (image/png or image/jpeg)
    - width: number
    - height: number
  Response: FileOpenAIResponse

POST /api/v2/files/recording
  Request: multipart/form-data
    - file: Blob (video/webm)
    - frames[]: Blob[] (optional, image/jpeg)
    - duration: number
    - has_audio: boolean
  Response: ScreenRecordingUploadResponse

POST /api/v2/files/audio
  Request: multipart/form-data
    - file: Blob (audio/webm or audio/mp3)
    - duration: number
  Response: FileOpenAIResponse

POST /api/v2/audio/transcribe
  Request: multipart/form-data
    - file: Blob (audio/*)
    - language: string (optional)
    - prompt: string (optional)
  Response: TranscriptionResponse
```

---

## 13. UI/UX Design

### 13.1 Recording Controls Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ MessageInput                                                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Attached Files/Captures Preview Area]                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ 📷 IMG   │  │ 🎥 VID   │  │ 🎙️ AUD   │              │   │
│  │  │ 10:23 AM │  │ 0:45     │  │ 0:30     │              │   │
│  │  │    [×]   │  │    [×]   │  │    [×]   │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Text Input Area]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────────────────┐ ┌──────┐   │
│  │  📎  │ │  📷  │ │  🎙️  │ │ ⏺ Recording 00:15  │ │ Send │   │
│  │ File │ │Screen│ │Audio │ │        ⏹ Stop      │ │  →   │   │
│  └──────┘ └──────┘ └──────┘ └────────────────────┘ └──────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Screen Capture Menu

```
┌─────────────────────────────┐
│ 📷 Screen Capture           │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 📸 Take Screenshot      │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ⏺️ Record Screen        │ │
│ │   └─ Include audio ☑️   │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Capture:                    │
│ ○ Entire Screen            │
│ ○ Application Window       │
│ ○ Browser Tab              │
└─────────────────────────────┘
```

### 13.3 Audio Recording UI

```
┌─────────────────────────────────┐
│ 🎙️ Audio Recording              │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ ▁▂▃▅▇▅▃▂▁▂▃▅▇▅▃▂▁      │   │
│  │     Audio Waveform       │   │
│  └─────────────────────────┘   │
│                                 │
│      ⏺ 00:15 / 05:00           │
│                                 │
│  Device: MacBook Pro Mic ▼     │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ⏸ Pause │ ⏹ Stop │ ✓ Done │ │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### 13.4 Recording States

| State | Indicator | Actions Available |
|-------|-----------|-------------------|
| Idle | Gray icons | Start capture/record |
| Recording | Pulsing red dot + timer | Stop, Pause |
| Paused | Yellow indicator | Resume, Stop |
| Processing | Spinner | None (wait) |
| Preview | Thumbnail/waveform | Send, Delete, Retake |
| Error | Red indicator + message | Retry, Dismiss |

---

## 14. Testing Strategy

### 14.1 Unit Tests

```typescript
// __tests__/lib/media/audio-processor.test.ts
describe('AudioProcessor', () => {
  it('should convert webm to mp3');
  it('should compress audio maintaining quality');
  it('should extract waveform data');
  it('should trim silence from edges');
});

// __tests__/hooks/useMediaRecorder.test.ts
describe('useMediaRecorder', () => {
  it('should request microphone permission');
  it('should start recording on command');
  it('should stop and return blob');
  it('should handle permission denial');
  it('should update audio level');
});

// __tests__/stores/useRecordingStore.test.ts
describe('useRecordingStore', () => {
  it('should initialize with default state');
  it('should track recording state correctly');
  it('should manage pending captures');
  it('should cleanup on unmount');
});
```

### 14.2 Integration Tests

```typescript
// __tests__/integration/screen-capture.test.ts
describe('Screen Capture Flow', () => {
  it('should capture screenshot and preview');
  it('should upload screenshot and add to message');
  it('should handle recording start/stop');
  it('should extract frames from recording');
});

// __tests__/integration/audio-recording.test.ts
describe('Audio Recording Flow', () => {
  it('should record audio and show waveform');
  it('should transcribe audio before sending');
  it('should include transcription in message context');
});
```

### 14.3 E2E Tests (Playwright)

```typescript
// e2e/recording.spec.ts
test.describe('Recording Features', () => {
  test('should capture screenshot via button', async ({ page }) => {
    // Grant permissions
    await context.grantPermissions(['camera']);

    // Click screenshot button
    await page.click('[data-testid="screenshot-button"]');

    // Select screen
    // ...

    // Verify preview appears
    await expect(page.locator('[data-testid="capture-preview"]')).toBeVisible();
  });

  test('should record audio and transcribe', async ({ page }) => {
    // Similar flow for audio
  });
});
```

### 14.4 Manual Testing Checklist

**Browser Compatibility:**
- [ ] Chrome 90+
- [ ] Firefox 90+
- [ ] Safari 15+
- [ ] Edge 90+

**Desktop (Tauri):**
- [ ] macOS 12+
- [ ] Windows 10/11
- [ ] Ubuntu 22.04+

**Feature Testing:**
- [ ] Screenshot: single monitor
- [ ] Screenshot: multi-monitor
- [ ] Screenshot: specific window
- [ ] Screen recording: with audio
- [ ] Screen recording: without audio
- [ ] Audio recording: various durations
- [ ] Audio transcription: accuracy
- [ ] Permission flows: grant/deny
- [ ] File size limits: handling
- [ ] Network errors: offline handling

---

## Appendix A: Browser Support Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| getUserMedia (audio) | ✅ | ✅ | ✅ | ✅ |
| getDisplayMedia | ✅ | ✅ | ✅* | ✅ |
| System Audio Capture | ✅ | ❌ | ❌ | ✅ |
| Tab Audio Capture | ✅ | ✅ | ❌ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| VP9 Codec | ✅ | ✅ | ❌ | ✅ |
| H.264 Codec | ✅ | ❌ | ✅ | ✅ |

*Safari requires specific user gesture and has limitations

---

## Appendix B: Error Handling Reference

| Error | Cause | User Message | Recovery |
|-------|-------|--------------|----------|
| NotAllowedError | Permission denied | "Please allow access to continue" | Show permission request |
| NotFoundError | No device available | "No microphone/camera found" | Check device settings |
| NotReadableError | Device in use | "Device is being used by another app" | Retry or select different device |
| OverconstrainedError | Constraints not met | "Unable to capture with requested settings" | Fallback to default settings |
| AbortError | Operation aborted | "Recording was interrupted" | Offer retry |
| SecurityError | Insecure context | "This feature requires a secure connection" | Redirect to HTTPS |

---

## Appendix C: Recommended Constraints

```typescript
// Optimal settings for various quality levels

export const AUDIO_CONSTRAINTS = {
  low: {
    sampleRate: 22050,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
  },
  medium: {
    sampleRate: 44100,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
  },
  high: {
    sampleRate: 48000,
    channelCount: 2,
    echoCancellation: false,
    noiseSuppression: false,
  },
};

export const VIDEO_CONSTRAINTS = {
  low: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 15 },
  },
  medium: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  },
  high: {
    width: { ideal: 2560 },
    height: { ideal: 1440 },
    frameRate: { ideal: 60 },
  },
};

export const RECORDING_LIMITS = {
  maxDuration: 300,        // 5 minutes
  maxFileSize: 100 * 1024 * 1024, // 100MB
  warningAt: 240,          // Warn at 4 minutes
};
```

---

## Summary

This implementation plan provides a comprehensive roadmap for adding screen capture and audio recording capabilities to the private-chat application. The architecture leverages existing patterns (Zustand stores, file upload pipeline, permission system) while introducing new components and hooks for media handling.

Key considerations:
1. **Progressive enhancement**: Features work in browser with enhanced capabilities on desktop
2. **Privacy-first**: User controls over what gets captured and shared
3. **AI-optimized**: Processing pipeline extracts meaningful context for AI consumption
4. **Cross-platform**: Works on web and Tauri desktop with graceful degradation

The phased approach allows for incremental delivery while maintaining code quality and user experience standards.
