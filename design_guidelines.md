# Design Guidelines: Conference AI Agent Engagement App

## Design Approach

**System Selected:** Tailwind-based minimal design system inspired by Linear and Stripe  
**Rationale:** This is a utility-first application where speed of access and conversation clarity are paramount. The interface should be nearly invisible, letting the AI Agent conversation be the star.

**Core Principle:** Frictionless access → immediate conversation → memorable product experience

---

## Typography

**Font Family:** Inter (Google Fonts)
- Headings: Inter 600 (semibold)
- Body: Inter 400 (regular)  
- Small text: Inter 500 (medium)

**Scale:**
- Hero/primary heading: text-4xl md:text-5xl
- Section headings: text-2xl md:text-3xl
- Body text: text-base md:text-lg
- Small text: text-sm
- Button text: text-base font-medium

---

## Layout System

**Spacing Units:** Tailwind 4, 6, 8, 12, 16, 24 (p-4, gap-6, mb-8, etc.)

**Container Strategy:**
- Full viewport on mobile (w-full px-4)
- Centered content: max-w-2xl mx-auto
- Conversation interface: max-w-4xl for wider video frame

**Vertical Rhythm:**
- Mobile: py-8 between sections
- Desktop: py-12 between sections

---

## Component Library

### Landing Page (NFC/Link Entry Point)

**Hero Section:**
- Full viewport height (min-h-screen flex items-center)
- Centered company logo (h-12 md:h-16)
- Large heading introducing the AI Agent experience
- Subheading explaining the 90-second conversation
- Prominent "Start Conversation" CTA button
- Small text below: "Tap your phone or click to begin"

**NFC Detection:**
- Auto-detect NFC tap and immediately redirect to conversation
- Seamless handoff - no extra steps
- Loading state: "Connecting to AI Agent..."

**Manual Access Section:**
- Secondary option for text/link access
- Simple input field or direct button if using unique URLs
- QR code display option for sharing (centered, medium size)

### Conversation Interface

**Video/Audio Container:**
- 16:9 aspect ratio video frame
- Rounded corners (rounded-lg)
- Subtle shadow (shadow-lg)
- Full width on mobile, centered max-w-3xl on desktop

**Conversation Controls:**
- Bottom-aligned control bar
- Microphone button (center, large, clear visual feedback when active)
- End conversation button (right-aligned, text-sm)
- Timer display showing remaining time (left-aligned, subtle)

**AI Response States:**
- Listening indicator (pulsing animation)
- Speaking indicator (subtle voice wave visualization)
- Processing state (minimal spinner)

**Conversation Flow:**
- Pre-conversation: Brief prompt ("Ask me anything about [Product]")
- Active conversation: Clean, distraction-free interface
- Post-conversation: Thank you screen with follow-up CTA

### Post-Conversation Screen

**Thank You Component:**
- Centered layout
- Friendly headline: "Thanks for chatting!"
- Brief product summary or key takeaway
- Primary CTA: "Visit Our Website" or "Schedule a Demo"
- Secondary CTA: "Learn More" linking to detailed resources
- Social proof element: "Join [X] companies using [Product]"

### Navigation

**Minimal Header (if present):**
- Company logo only (left-aligned, h-8)
- No navigation menu needed - single-purpose experience
- Subtle border-bottom only

**No Footer on Conversation Screen**
- Footer only on landing/post-conversation with minimal links

---

## Interactive Elements

**Primary CTA Button:**
- Large, rounded-full
- Generous padding: px-8 py-4
- Text: font-medium text-base
- Subtle shadow on hover
- When over images: backdrop-blur-sm with semi-transparent background

**Secondary Button:**
- Outlined style (border-2)
- Same size/padding as primary
- Transparent background

**Input Fields (if needed for manual link access):**
- Simple border (border-2)
- Rounded-lg
- Focus state: border accent with subtle ring
- Placeholder text in muted color

---

## Animations

**Use Sparingly:**
- NFC detection: Subtle fade-in of connection message
- AI listening/speaking: Gentle pulsing animation (scale 1 to 1.05)
- Button hover: Quick opacity/shadow transition (duration-200)
- No page transitions or scroll effects

---

## Accessibility

**Critical Requirements:**
- High contrast text throughout
- All interactive elements minimum 44x44px touch target
- Focus indicators on all buttons/inputs
- ARIA labels for conversation state ("AI is listening", "AI is speaking")
- Closed captions option for AI video responses (if Tavus supports)

---

## Images

**Logo Placement:**
- Landing page hero: Centered, above headline
- Conversation screen: Small version in header only if included

**No Hero Image:**
This is a function-first app - skip background imagery to maintain focus. The AI Agent video IS the visual centerpiece.

**Optional Background Treatment:**
- Landing page: Very subtle gradient (top to bottom)
- Conversation screen: Solid neutral background to keep focus on video

---

## Mobile-First Considerations

**Conference Context Priorities:**
1. Instant loading (minimal assets, optimized code)
2. Works offline after initial load if possible
3. Large touch targets (buttons minimum h-12)
4. Portrait orientation primary (most users hold phones vertically)
5. Auto-start conversation on NFC tap - zero extra taps needed
6. Clear audio controls - conference halls are noisy

**Responsive Breakpoints:**
- Mobile: Default styling (sm: rarely needed)
- Tablet: md: (768px) - slightly larger text/spacing
- Desktop: lg: (1024px) - max-width containers, side margins

---

## Key User Flows

1. **NFC Tap:** Tap → Auto-load conversation → AI greeting → 90s interaction → Thank you screen
2. **Manual Link:** Open link → Landing page → Click "Start" → Conversation → Thank you screen
3. **Share Flow:** Generate unique URL → Display QR code → Copy link option

Each flow should complete in under 3 seconds to conversation start.