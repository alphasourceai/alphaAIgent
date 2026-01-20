# AlphaScreen AI Demo Application

An interactive web application that allows users to have AI-powered conversations about alphaScreen through Tavus AI integration.

## Overview

This application provides a streamlined experience for potential customers to learn about alphaScreen by having a 2.5-minute conversation with an AI agent. The experience can be initiated via NFC tap, QR code scan, shared link, or direct website access.

**alphaScreen Product:** A next-generation hiring tool that automates the entire screening process using AI-driven video interviews, resume analysis, and objective scoring. It helps companies screen candidates faster, more fairly, and more consistently than traditional methods.

## Features

- **Splash Screen**: Creative animated introduction with AlphaSource symbol on first app load
- **Landing Page**: Clean, branded landing page with AlphaSource logo
- **NFC Detection**: Auto-detects NFC taps and immediately starts conversation
- **Streamlined AI Conversation**: Uses Daily.js SDK for auto-join, showing only AI agent video (participant camera is on but not displayed)
- **Session Management**: Tracks conversation sessions with unique IDs
- **Conversation Timer**: 2.5-minute (150-second) countdown timer with visual warnings for time remaining
- **Thank You Page**: Post-conversation follow-up with CTAs to website and demo form

## Tech Stack

- **Frontend**: React with Vite, TailwindCSS, Shadcn UI components
- **Backend**: Express.js
- **AI**: Tavus AI API for conversational video
- **Video SDK**: Daily.js SDK for programmatic video control and auto-join
- **Storage**: In-memory storage (MemStorage)
- **Routing**: Wouter (lightweight React router)

## User Flow

1. First-time visitors see animated splash screen with AlphaSource symbol (~3 seconds)
2. User lands on homepage (/)
3. User clicks "Start Conversation" or taps NFC-enabled device
4. App generates unique session ID and navigates to `/conversation/:sessionId`
5. Frontend calls `POST /api/conversations` with sessionId, personaId (optional), replicaId (optional)
6. Backend creates Tavus conversation session via Tavus API
7. Backend stores session data (conversationId, conversationUrl, status)
8. Frontend uses Daily.js SDK to auto-join the Tavus conversation (skips prejoin screen)
9. Browser prompts for camera/mic permissions (first time only)
10. User sees only AI agent video in a centered contained box (their camera is on but not displayed to them)
11. AI agent proactively greets user and begins conversation
12. User has 2.5-minute conversation with AI agent about alphaScreen
13. After timer expires or user clicks "End", redirects to `/thank-you`
14. Thank you page displays with follow-up CTAs

## API Endpoints

### POST /api/conversations
Creates a new Tavus conversation session with AI context for alphaScreen.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "personaId": "optional-persona-id",
  "replicaId": "optional-replica-id",
  "documentIds": ["doc-id-1", "doc-id-2"],
  "attendeeName": "Optional attendee name"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "conversationUrl": "https://tavus.daily.co/...",
  "conversationId": "tavus-conversation-id"
}
```

**Features:**
- Automatically uses `TAVUS_REPLICA_ID` or `TAVUS_PERSONA_ID` from environment if not provided
- Includes conversational context instructing AI to discuss alphaScreen as AlphaSource Technologies representative
- Supports attaching knowledge base documents for accurate product information
- Configures webhook callback if `TAVUS_WEBHOOK_SECRET` is set
- Enhanced error handling with detailed diagnostics

### GET /api/sessions/:sessionId
Retrieves session data for a given session ID.

**Response:**
```json
{
  "id": "uuid",
  "conversationId": "tavus-conversation-id",
  "conversationUrl": "https://tavus.daily.co/...",
  "status": "active",
  "createdAt": "2024-11-14T..."
}
```

## Environment Variables

- `TAVUS_API_KEY`: API key for Tavus AI service (required)
- `TAVUS_REPLICA_ID`: Default replica ID for Tavus conversations (recommended)
- `TAVUS_DOCUMENT_STRATEGY`: Document strategy for Tavus (optional)
- `TAVUS_WEBHOOK_SECRET`: Webhook secret for Tavus callbacks (optional)
- `SESSION_SECRET`: Session secret for Express (already configured)

**Note:** The application validates that either `TAVUS_REPLICA_ID` is configured or a `replicaId`/`personaId` is explicitly provided when creating conversations. Startup warnings will appear if `TAVUS_API_KEY` or `TAVUS_REPLICA_ID` are not configured.

## Tavus Integration Features

Based on the reference implementation from the user's other product, the integration now includes:

1. **Proactive Greeting**: AI agent automatically greets users when they join using the `custom_greeting` parameter:
   - Greeting: "Welcome! I'm excited to share how alphaScreen can transform your hiring process. Would you like to dive into a specific feature or hear a quick summary first?"
   - The agent speaks FIRST without waiting for the user to speak
   - Creates immediate engagement with an enthusiastic, feature-focused tone

2. **Conversational Context**: AI is pre-instructed with comprehensive alphaScreen knowledge base including:
   - Product overview (next-generation hiring tool with AI-driven conversations)
   - Key features (automated scoring, resume analysis, role-specific evaluation, EEOC/ADA compliance)
   - How it works (5-step process from role creation to automated reports)
   - Value proposition (save time, reduce bias, increase throughput, improve quality)
   - Use cases and typical customer profiles
   - Product demonstration framing (NOT interview language - uses "applicants", "assessments", "AI conversations")
   - Pronunciation guidance: "resume" as "rez-oo-MAY" and website as "alpha source A I dot com"
   - The AI delivers this information in brief, engaging responses within the 2.5-minute time limit

3. **Document Retrieval**: Supports attaching knowledge base documents via `document_ids` parameter. Documents are used by the AI to provide accurate, factual responses about alphaScreen.

4. **Document Strategy**: Uses `TAVUS_DOCUMENT_STRATEGY` (default: "balanced") to control document retrieval. Options: "speed", "balanced", "quality".

5. **Webhook Integration**: Automatically configures `callback_url` for Tavus to notify the application when conversations end (if `TAVUS_WEBHOOK_SECRET` is configured).

6. **Enhanced Error Handling**: Robust error handling with detailed logging and graceful fallbacks.

7. **Flexible Identification**: Supports both `persona_id` and `replica_id` with environment variable defaults.

## Key Components

### Frontend
- `client/src/App.tsx`: Main app component with splash screen logic and routing
- `client/src/components/SplashScreen.tsx`: Animated splash screen with AlphaSource symbol
- `client/src/pages/landing.tsx`: Landing page with start button and NFC detection
- `client/src/pages/conversation.tsx`: Conversation page that initiates Tavus session
- `client/src/pages/thank-you.tsx`: Post-conversation thank you page with CTAs to https://www.alphasourceai.com
- `client/src/components/AIConversationInterface.tsx`: Main conversation component that orchestrates the Tavus session
- `client/src/components/DailyVideoInterface.tsx`: Daily.js SDK integration for auto-join and video rendering
- `client/src/components/Logo.tsx`: AlphaSource logo component
- `client/src/components/NFCDetector.tsx`: NFC detection component
- `client/src/components/ConversationTimer.tsx`: Countdown timer component

### Backend
- `server/routes.ts`: API routes for conversation creation and session management
- `server/storage.ts`: In-memory storage interface for session data
- `shared/schema.ts`: Shared TypeScript types and Zod schemas

## Brand Assets

- Full logo: `attached_assets/Color logo - no background_1763141849175.png`
- Symbol logo: `attached_assets/alpha-symbol copy_1763141740352.png`

## Design System

- **Colors**: 
  - Background: Dark blue (#061551)
  - Primary: Lilac (#AD8BF7)
  - Text: Off-white (#EBFEFF)
- **Font**: Raleway
- **UI Library**: Shadcn UI with custom color tokens

## Testing Notes

- NFC functionality requires HTTPS and compatible devices
- Tavus conversations require valid TAVUS_API_KEY
- Conversation duration is set to 2.5 minutes (150 seconds) with visual timer that turns red in final 20 seconds
- Sessions are stored in-memory and will be lost on server restart

## Optional: Speed Up AI Avatar Speech

To make the Tavus AI avatar speak 10-15% faster, update your persona's voice settings via the Tavus API:

```bash
curl --request PATCH \
  --url https://tavusapi.com/v2/personas/YOUR_PERSONA_ID \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: YOUR_TAVUS_API_KEY' \
  --data '[
    {
      "op": "replace",
      "path": "/layers/tts/voice_settings/speed",
      "value": "fast"
    }
  ]'
```

**Speed Options:** `"slow"`, `"normal"`, `"fast"`

This is a one-time persona configuration change. All future conversations using this persona will have faster speech.

## Navigation Paths

- `/` - Landing page (with splash screen on every visit)
- `/conversation/:sessionId` - Conversation page (supports ?personaId=X&replicaId=Y&source=X query params)
- `/thank-you` - Thank you page

## NFC Tag Setup for Conference Booth

To track which attendees tap NFC tags vs scan QR codes vs click links, use these URLs when programming NFC tags:

### **Programming NFC Tags with Source Tracking**

1. **Download "NFC Tools" app** (free) from iPhone App Store
2. Open app → Tap **"Write"**
3. Tap **"Add a record"** → Select **"URL"**
4. Enter your Replit app URL with source tracking:
   ```
   https://your-app.replit.dev?source=nfc
   ```
5. **Important:** Do NOT add a description (breaks iOS compatibility)
6. Tap **"Save & Write"** → Hold top center of iPhone to blank NFC tag
7. Done! Tag now opens your app with NFC tracking

### **Recommended NFC Tags**
- **NTAG213** (180 bytes) or **NTAG215** (540 bytes)
- Buy blank/unlocked tags from Amazon (~$14 for 50 tags)
- Sticker format works great for booth tables and handouts

### **Source Tracking**

The app automatically tracks traffic sources:
- **NFC Tap**: `?source=nfc` - From programmed NFC tags
- **Link Share**: `?source=link` - From "Copy Link" button
- **Direct**: No parameter - Typed URL or bookmark
- **QR Code**: Add `?source=qr` when generating QR codes

Traffic sources are:
- Logged to console: `📊 New conversation - Session: abc123, Source: nfc`
- Included in Tavus conversation name: `alphaScreen Demo (nfc) [abc123]`
- Visible in your Replit logs for analytics

## Splash Screen

The application features an animated splash screen that displays when the app is first opened:

**Animation Features:**
- AlphaSource symbol logo with scale + rotate entrance animation (elastic easing)
- Pulsing purple glow background effect
- Animated drop shadow with primary color
- Three loading indicator dots with sequential animation
- ~2.5 second display duration with 0.6 second fade out

**Session Behavior:**
- Shows on EVERY app load (perfect for sharing via text/NFC)
- Attendees see splash → homepage → conversation flow
- No session persistence - fresh experience each time
- Safe for SSR and test environments

**Technical Details:**
- Built with framer-motion for smooth animations
- Uses AlphaSource symbol: `attached_assets/alpha-symbol copy_1763141740352.png`
- Memoized callbacks prevent unnecessary re-renders
- Proper cleanup of all animation timers

## Daily.js Video Interface

The application uses Daily.js SDK for streamlined video conversation experience:

**Video Display Layout:**
- AI agent video displayed in a **centered contained box** (not fullscreen)
- Maximum width: 896px (Tailwind `max-w-4xl`)
- Aspect ratio: 16:9 (`aspect-video`)
- Rounded corners with drop shadow for polished appearance
- Dark blue background (#061551) visible around video box
- Professional, focused conference booth experience

**Loading State Logic:**
- `hasRemoteVideo` state tracks availability of AI agent's video track
- Loading overlay ("Waiting for AI agent...") visible until video track is ready
- Only hides overlay when `aiAgent.videoTrack` is present (not just audio)
- Audio-only scenarios: overlay stays visible while audio plays
- Properly resets on disconnect/reconnect scenarios
- Event listeners: `track-started`, `track-stopped`, `participant-joined/updated/left`

**Video Controls:**
- Floating at top of screen: Timer (left) + End button (right)
- Semi-transparent background with backdrop blur
- Does not block or overlap video box
- Positioned via `absolute top-0 left-0 right-0 z-10`

**Auto-Join Flow:**
- Daily.js CallObject mode (not Prebuilt iframe)
- Skips prejoin/haircheck screen for streamlined experience
- Auto-joins immediately after camera/mic permissions granted
- Only displays remote participant (AI agent) video
- User's camera is ON but self-view is hidden
- Proper cleanup on unmount to prevent duplicate instance errors

**Robustness:**
- Handles disconnect/reconnect gracefully
- Properly manages video track availability changes
- Audio continues playing even when video unavailable
- Loading overlay reappears if video track drops
- No "Duplicate DailyIframe instances" errors
