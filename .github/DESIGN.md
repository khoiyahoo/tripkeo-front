---
name: Vibrant Travel System
colors:
  surface: '#f5fafb'
  surface-dim: '#d5dbdc'
  surface-bright: '#f5fafb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5f5'
  surface-container: '#e9eff0'
  surface-container-high: '#e3e9ea'
  surface-container-highest: '#dee3e4'
  on-surface: '#171d1e'
  on-surface-variant: '#3c494b'
  inverse-surface: '#2b3132'
  inverse-on-surface: '#ecf2f3'
  outline: '#6c797b'
  outline-variant: '#bcc9cb'
  surface-tint: '#006973'
  primary: '#006973'
  on-primary: '#ffffff'
  primary-container: '#67e8f9'
  on-primary-container: '#006771'
  inverse-primary: '#54d8e8'
  secondary: '#006781'
  on-secondary: '#ffffff'
  secondary-container: '#8fdfff'
  on-secondary-container: '#00647d'
  tertiary: '#775a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffd15e'
  on-tertiary-container: '#755900'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#91f1ff'
  primary-fixed-dim: '#54d8e8'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f57'
  secondary-fixed: '#b9eaff'
  secondary-fixed-dim: '#81d1f0'
  on-secondary-fixed: '#001f29'
  on-secondary-fixed-variant: '#004d62'
  tertiary-fixed: '#ffdf97'
  tertiary-fixed-dim: '#edc150'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#5a4300'
  background: '#f5fafb'
  on-background: '#171d1e'
  surface-variant: '#dee3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is built to evoke the sensation of a tropical breeze and the excitement of a new itinerary. It moves away from the sterile, corporate blues often found in the travel industry, opting instead for a palette that feels refreshing and oxygenated.

The style is **Modern High-Energy**, blending a clean, professional structure with vibrant, light-filled accents. It leverages high-key whitespace, crisp typography, and subtle glassmorphism to create a sense of depth and clarity. The goal is to make the user feel like they are already on vacation—relaxed yet energized.

## Colors
This design system utilizes a high-contrast, refreshing palette:

- **Aqua Mint (#67E8F9):** The primary driver. Used for core interactions, active states, and brand moments. It represents water and sky.
- **Deep Teal (#0E7490):** The grounding force. Used for high-hierarchy text, secondary buttons, and icons to provide professional depth.
- **Warm Sand (#FDE68A):** The spark. Reserved exclusively for "magic moments"—special deals, saved trips, and exclusive highlights.
- **Soft Slate (#F1F5F9):** The canvas. Used for page backgrounds to reduce eye strain while maintaining a crisp, modern feel.

## Typography
The system utilizes **Plus Jakarta Sans** for its friendly yet precise geometric qualities. 

- **Display & Headlines:** Use tight letter-spacing and heavy weights (Bold/ExtraBold) to create a high-energy, editorial feel.
- **Body Text:** Set in Regular weight with generous line-height to ensure legibility during long-form discovery.
- **Labels:** Use Medium or SemiBold weights for small UI elements to maintain a professional, structured appearance even at 12px.

## Layout & Spacing
The layout follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

The rhythm is based on an **8px linear scale**. Use "Breathable Margins"—larger internal paddings within cards and sections (minimum 24px) to emphasize the "refreshing" aspect of the design system. Desktop views should utilize centered containers with a max-width of 1280px to maintain focus, while mobile views leverage edge-to-edge cards with 16px horizontal safe-area margins.

## Elevation & Depth
The design system employs **Tonal Layering** combined with **Ambient Shadows**. 

1.  **Level 0 (Base):** Soft Slate (#F1F5F9) background.
2.  **Level 1 (Cards):** Pure White (#FFFFFF) surfaces with a very soft, diffused Deep Teal shadow (Opacity: 4%, Blur: 12px, Y: 4px).
3.  **Level 2 (Modals/Popovers):** Pure White with a more pronounced shadow and a 1px Soft Slate border to define edges.

Optional **Glassmorphism** can be applied to navigation bars and floating filters using a background blur (12px) and 80% opacity White fill, allowing the vibrant colors of travel photography to bleed through subtly.

## Shapes
Following the **Round Eight** rule, all primary containers, buttons, and input fields utilize an 8px (0.5rem) corner radius. This strikes a balance between modern professional structure and approachable softness. 

- **Cards:** 16px (1rem) for larger surface areas.
- **Buttons/Inputs:** 8px (0.5rem) consistent radius.
- **Images:** Always clipped to the container's 8px or 16px radius to maintain a clean, organized aesthetic.

## Components

- **Buttons:** 
  - *Primary:* Aqua Mint background with Deep Teal text for maximum vibration. 
  - *Secondary:* Deep Teal stroke with transparent background.
  - *Accent:* Warm Sand background for "Book Now" or "Special Offer" CTAs.
- **Chips:** Used for travel tags (e.g., "Beach", "Budget"). Use a light tint of Aqua Mint (10% opacity) with Deep Teal text.
- **Input Fields:** 8px rounded, 1px Soft Slate border. On focus, the border transitions to Aqua Mint with a 2px outer glow.
- **Cards:** White background, 16px radius. Images should take the top half of the card with no margin. Content follows with 20px internal padding.
- **Travel Timeline:** A unique component using Deep Teal vertical lines and Aqua Mint nodes to visualize travel itineraries.
- **Special Highlights:** Use a "Sand Glow" effect—a thin 2px Warm Sand bottom border or a subtle sand-colored background-glow for featured travel moments.