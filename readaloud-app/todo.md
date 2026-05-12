# ReadAloud - Project TODO

## Branding & Setup
- [x] Generate app logo (owl mascot)
- [x] Update theme colors (dark navy + warm orange)
- [x] Update app.config.ts (name, orientation to landscape)
- [x] Configure icon-symbol.tsx with required icons
- [x] Add expo-speech, expo-camera to dependencies

## Navigation
- [x] Configure tab navigation (Home, Library)
- [x] Add camera screen route (full-screen, no tab bar)
- [x] Add learning screen route (full-screen, no tab bar)

## Home Screen
- [x] Full-screen landscape layout
- [x] Large "Scan a Book" camera button
- [x] Recent books grid
- [x] App logo and title

## Camera Screen
- [x] Camera permission handling
- [x] Full-screen camera preview with CameraView
- [x] Crop frame overlay UI
- [x] Capture button
- [x] Gallery picker fallback
- [x] Flash toggle

## Backend / API
- [x] tRPC route: extractSentences (image URL → sentences + Korean translation)
- [x] Server-side: upload image to storage, call invokeLLM with vision
- [x] tRPC route: saveScanSession (save to AsyncStorage)

## Learning Screen
- [x] Full-screen landscape immersive layout
- [x] English sentence display (large, bold)
- [x] TTS integration with expo-speech
- [x] Word-by-word highlight during TTS (onBoundary)
- [x] Korean translation display
- [x] Show/Hide Korean toggle
- [x] Auto mode (auto-advance after sentence done)
- [x] Manual mode (swipe/arrow navigation)
- [x] Speed control (0.5x ~ 1.5x, turtle/rabbit icons)
- [x] Progress indicator (3/8)
- [x] Owl mascot decoration

## Library Screen
- [x] Grid of saved sessions
- [x] Session card (thumbnail, title, count, date)
- [x] Delete session
- [x] Tap to resume learning

## Storage
- [x] AsyncStorage: save/load scan sessions
- [x] AsyncStorage: save last learning position
