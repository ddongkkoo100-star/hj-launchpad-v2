# ReadAloud - App Design Plan

## Target Device
Android Tablet (landscape orientation, 16:9 or 4:3 ratio, 10~12 inch)

## Color Palette
- Background (Dark): `#0D1B2A` (deep navy)
- Surface: `#1A2E45` (dark blue card)
- Primary: `#F5A623` (warm orange - playful, energetic)
- Secondary: `#4ECDC4` (teal - calm, learning)
- Accent: `#FFE66D` (yellow - highlight for TTS word)
- Text Primary: `#FFFFFF`
- Text Secondary: `#A8C0D6`
- Korean Text: `#C8E6FA` (soft blue)
- Success: `#6BCB77`
- Error: `#FF6B6B`

## Screen List

### 1. Home Screen (`/`)
- Full-screen landscape layout
- Large "Scan a Book" camera button (center)
- Recent books grid (bottom half)
- App logo + title (top left)
- Settings icon (top right)

### 2. Camera Screen (`/camera`)
- Full-screen camera preview
- Glowing crop frame overlay
- Capture button (bottom center)
- Gallery picker (bottom left)
- Flash toggle (bottom right)
- Back button (top left)

### 3. Processing Screen (modal/overlay)
- Animated loading spinner
- "AI가 문장을 읽고 있어요..." text
- Progress indication

### 4. Learning Screen (`/learn/[id]`)
- Full-screen landscape, immersive dark background
- Top bar: Back | Mode Toggle (Auto/Manual) | Settings
- Center card: English sentence (very large, bold white)
  - Current word highlighted in yellow during TTS
- Korean translation card (below English)
  - Show/Hide toggle button
- Bottom control bar:
  - Turtle icon (slow) | Speed label | Prev | Play/Pause | Next | Speed label | Rabbit icon (fast)
- Progress dots (bottom)
- Cute owl mascot (top right corner)

### 5. Library Screen (`/library`)
- Grid of saved book sessions
- Each card: thumbnail image + title + sentence count + date
- Delete swipe action
- Tap to resume learning

## Key User Flows

### Scan Flow
1. Home → tap "Scan a Book" → Camera screen
2. Camera → align book → tap capture → Processing overlay
3. Processing → AI extracts sentences + Korean translation → Learning screen

### Learning Flow (Auto Mode)
1. Learning screen loads → first sentence displayed
2. TTS reads sentence → current word highlighted
3. After sentence done → 2s pause → next sentence auto-plays
4. Last sentence → show completion animation

### Learning Flow (Manual Mode)
1. Learning screen loads → first sentence displayed
2. User taps play → TTS reads current sentence
3. User swipes left/right or taps arrows to navigate
4. User can replay any sentence at any speed

### Speed Control
- Tap turtle → decrease speed (min 0.5x)
- Tap rabbit → increase speed (max 1.5x)
- Speed shown as label between icons: 0.5x / 0.75x / 1.0x / 1.25x / 1.5x

## Typography
- English sentences: Font size 48-64sp, bold, white
- Korean translation: Font size 24-28sp, regular, soft blue
- UI labels: Font size 14-18sp

## Navigation Structure
```
app/
  (tabs)/
    index.tsx        ← Home screen
    library.tsx      ← Library screen
  camera.tsx         ← Camera screen (full-screen, no tab bar)
  learn/
    [id].tsx         ← Learning screen (full-screen, no tab bar)
```
