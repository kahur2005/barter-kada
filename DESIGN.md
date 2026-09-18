# Barter Visual System

<!-- impeccable:design-schema 1 -->

## Direction

Barter uses a dark, image-led interface built for mobile browsing and local exchange. One object or one decision owns each screen. Large type names the current task, product photography supplies warmth, and color carries state instead of decoration.

The approved references are:

- `.impeccable/mocks/app-wide-discovery.png`
- `.impeccable/mocks/app-wide-listing-detail.png`
- `.impeccable/mocks/app-wide-transaction-chat.png`
- `.impeccable/mocks/decision/challenger-video.png` for the listing review flow

These images set composition and finish. Production controls and text remain semantic HTML and must reflow rather than imitate fixed pixels.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Night | `#111318` | Page and shell background |
| Raised night | `#1A1D23` | Secondary surfaces, fields, message bubbles |
| White | `#FFFFFF` | Primary text and icons |
| Quiet text | `#B7BAC4` | Supporting text and inactive navigation |
| Rule | `#353942` | Separators and quiet borders |
| Electric lime | `#D6FF4B` | One primary action, current progress, active navigation |
| Coral | `#FF7A59` | Price, money, and high-consequence emphasis |
| Error | `#FF957D` | Validation and failed actions |

Lime identifies the action a person should take next. It does not fill ordinary cards or decorate headings. Coral belongs to prices and money-related warnings; it must not compete with the primary action.

## Typography

Use the existing system sans-serif stack so the interface stays fast and familiar on mobile devices. Personality comes from scale, weight, and tight display tracking:

- Display headings: `clamp(2.35rem, 11vw, 4.75rem)`, weight 800, line height 0.98 to 1.05.
- Page headings: `clamp(2rem, 8vw, 3.5rem)`, weight 800, line height 1.02.
- Section headings: 1.25 to 1.6rem, weight 750.
- Body: 1rem, line height 1.5.
- Metadata: 0.82 to 0.92rem, quiet text color, never tracked uppercase.

Keep text left aligned. Labels stay in sentence case, and line length should remain below 70 characters on wide screens.

## Layout

Mobile is the source layout. Pages use the full viewport width with 18 to 24 pixels of side padding; imagery may break out to the edges when it carries the object being discussed. The usual order is title, current context, primary content, supporting facts, then the action dock.

Desktop does not turn the app into a dashboard. Content grows into a restrained two-column composition: the image or active object occupies the larger column, while facts and actions sit in a sticky secondary column. Lists may gain columns, but reading order remains unchanged.

Use a four-pixel base spacing system. Common gaps are 8, 12, 16, 24, 32, and 48 pixels. Borders are one pixel. Radius varies by purpose: 14 to 18 pixels for major actions and media, 10 to 12 pixels for fields and notices, circles for standalone icon controls. Ordinary content sections use separators rather than nested card stacks.

## Shell and Navigation

The global shell uses Night everywhere, including authentication, discovery, account, chat, transactions, stores, reviews, and admin tools. The wordmark stays white with a lime period.

On small screens, the five-part bottom navigation remains fixed above the safe area. The center listing action is a circular lime control. The active destination uses both a lime icon and a visible text label. Detail, editor, chat, and transaction rooms may replace the bottom navigation with a route-specific action dock.

At 768 pixels and above, navigation moves into the header. The same labels, active state, and ordering remain so users do not have to relearn the app.

## Shared Patterns

### Media-led listings

Discovery cards put the photo first. A dark scrim may protect text at the lower edge of an image, but the photo should not be tinted. Price uses coral, and condition plus distance use icons with plain text. Dense results can use a two-column mobile grid; the first recommended item may span both columns.

### Facts and privacy

Details appear as labeled rows separated by hairlines. Each row may have one circular icon, a quiet label, and a clear value. Private location language always includes a lock icon and explicit wording. Color alone never communicates privacy or status.

### Progress

Steps use connected numbered circles with a text label. Lime marks the current or completed stage. Screens that are not a sequence must not borrow this pattern.

### Actions

The main action sits in a sticky bottom dock on task screens. It uses lime, dark text, a minimum height of 56 pixels, and a verb that states the result. One outlined secondary action may sit beside it. Dangerous actions stay away from lime and require confirmation when the existing flow does.

### Forms and messages

Inputs use Raised night, white values, permanent labels, and a lime focus ring. Error text uses Error plus an icon or explicit message. Chat uses dark neutral bubbles for incoming messages and lime for the user's messages; system and privacy notes stay in bordered rows outside the conversation voice.

### Empty, loading, and failure states

Status views keep the same dark field and left alignment. A short heading explains the state, one sentence says what the person can do, and at most one primary recovery action appears. Loading placeholders reserve the final layout to prevent large shifts.

## Imagery

Use real listing photos when the data supplies them. Photos should fill their frame with `object-fit: cover`, preserve the primary subject, and avoid artificial color overlays. Missing media becomes a quiet dark placeholder with a useful label; never invent product photography inside the running app.

## Motion

Motion explains state changes. Bottom sheets, dialogs, tab indicators, and progress updates may use 150 to 220 millisecond transitions. Avoid page-load cascades, looping decoration, and hover movement on touch-first cards. Under `prefers-reduced-motion`, remove translation and nonessential animation.

## Accessibility and Adaptation

The system must reflow at 320 CSS pixels and remain usable at 200% text zoom. Interactive targets are at least 44 by 44 pixels, focus outlines use lime with a visible offset, and sticky docks include safe-area padding. Every image has useful alternative text unless it repeats adjacent text. Dialogs retain focus handling, and status changes use the current live-region behavior.

## Do Not Use

Do not reintroduce purple chrome, white floating cards, decorative gradients, glass effects, generic marketplace badges, engagement counters, or several bright accents on one screen. Avoid rounding every container. The visual character comes from photography, type scale, exact spacing, and decisive state color.
