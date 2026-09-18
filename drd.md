# Barter UI Redesign Design Requirements Document

## Purpose

This document is the self-contained brief for redesigning Barter in Figma Make. It describes the product, users, visual direction, screens, interactions, content, and acceptance criteria.

## Product context

Barter is a mobile-first neighborhood marketplace for Indonesia, focused on Jabodetabek. Users can sell items, exchange items through barter, give items away for free, and promote small local businesses such as catering, food sellers, and UMKM stores.

This is a redesign of an existing React/Vite application, not a new product. Preserve the existing business rules and product meaning. Build a polished responsive prototype with realistic Indonesian demo content and working navigation between screens.

The product should feel fast to scan, local, practical, friendly, and trustworthy. Its visual language should resemble a modern classified marketplace or neighborhood directory, not a luxury shopping app, social media feed, or conventional e-commerce checkout.

## Users

1. Residents looking for nearby items. They compare title, price, condition, location, distance, and offer type.
2. People selling or exchanging personal items. They publish a listing without creating a store.
3. Home businesses and UMKM sellers. They publish food, catering, preorder, and catalogue listings with availability, minimum order, pickup area, and preparation dates.
4. People completing a barter. They review both offers, approve the current agreement version, confirm handover, and understand the next step.
5. Admin users. They review reports, transaction context, status history, and decision actions.

## Product rules

- Users can browse public listings before signing in.
- The primary service area is Jabodetabek.
- Show approximate area and approximate distance only.
- Never show an exact residential address or precise map pin.
- Listing types are Jual, Barter, Jual atau barter, Gratis, PO, and Catering.
- Barter happens through chat and an agreement room.
- Barter does not process payments.
- Payments for sales, deposits, shipping, and refunds happen directly between users outside Barter.
- Do not create a checkout flow or payment gateway.
- Do not add phone-number login.
- Login options are Google and email/password.
- PO and catering are not locked behind Plus.
- Plus represents a subscription feature, not user verification or trust.
- Do not add fake verification badges.
- Listing owners see Kelola listing instead of transaction CTAs on their own listings.
- Preview/demo data must be visibly labelled as non-transactional.

## Visual direction

Use a clean classified-marketplace layout with strong typography, generous white space, thin dividers, and restrained use of cards.

### Color tokens

| Token | Value | Use |
| --- | --- | --- |
| paper | `#FFFFFF` | Page background, fields, primary button text |
| surface | `#F3F4F6` | Section headers, summary panels, skeletons |
| ink | `#202124` | Titles and primary content |
| muted | `#5F6368` | Metadata, helper text, secondary content |
| action | `#3730A3` | Links, primary buttons, active states, focus ring |
| action-hover | `#312E81` | Hover and pressed states |
| action-light | `#EEF2FF` | Selected backgrounds and light emphasis |
| action-border | `#C7D2FE` | Action-related borders |
| danger | `#B42318` | Errors and destructive actions |
| danger-background | `#FEF3F2` | Error panels |
| success | `#18794E` | Completed states |
| warning | `#A15C00` | Warnings and pending attention |
| rule | `#DADCE0` | Dividers and neutral borders |

### Typography

- Use a system UI font stack with Segoe UI or a similar neutral sans-serif.
- Page title: 24px, line-height 30px, weight 700.
- Section heading: 18px, line-height 26px, weight 600.
- Listing title: 16px, line-height 22px, weight 600.
- Body text and inputs: 16px, line-height 24px.
- Metadata: 14px, line-height 20px.
- Navigation labels: 12px, line-height 16px.
- Main price: 18px, line-height 24px, weight 700.
- Use tabular numerals for prices and totals.

### Layout rules

- Mobile reference frame: 390 × 844px.
- Also support 320px, 768px, 1024px, and 1440px widths.
- Mobile gutter: 16px; use 12px at 320px width.
- Desktop maximum content width: 1200px.
- Use spacing values of 4, 8, 12, 16, 24, and 32px.
- Touch targets must be at least 48 × 48px.
- Use 4px radius for fields and buttons, and 8px for larger panels and dialogs.
- Use borders and spacing to separate content. Avoid excessive floating cards.
- Use shadows only for dialogs, sheets, and the support chat panel.
- Do not use gradients, glass effects, autoplay video, decorative blobs, or oversized hero sections.
- Do not make every element into a pill.
- Use one consistent outline icon family. Important actions must also have visible text labels.

## Navigation

### Mobile

Use a fixed bottom navigation with five items:

- Beranda
- Cari
- Pasang
- Pesan
- Akun

The active item must use both color and a visible background or indicator. Do not communicate active state through color alone.

### Desktop

Move the main navigation into the top header. Do not show desktop navigation and mobile bottom navigation at the same time.

The header contains the Barter wordmark, approximate area selector, notification action, and desktop navigation when the viewport is wide enough. Use a simple text wordmark; do not create a separate corporate logo.

## Screens

This is a multi-screen application redesign. Do not generate only one landing page or one dashboard screen.

Create every screen listed below as a separate route or clearly separated frame. Connect the screens with working navigation so the prototype can be explored as one product. Each screen must have its own responsive mobile version and a desktop version where the layout rules require it.

Required output:

- At least 11 distinct primary screens.
- Separate screens for Home, Search results, Listing detail, Store profile, Inbox, Chat, Barter room, Order room, Create listing, Account, Notifications, and Admin reports.
- A reusable component layer shared across all screens.
- Navigation links between related screens, including Home → Listing detail → Chat → Barter room or Order room.
- Back navigation that returns to the previous context.
- Visible mobile bottom navigation and desktop header navigation in their appropriate breakpoints.
- A screen index or overview frame showing all primary screens and their names.

Do not collapse multiple screens into tabs inside one page. Tabs may represent local content states, but Home, Search, Detail, Chat, Transactions, Account, and Admin must remain separate screens.

### 1. Home and discovery

Mobile order:

1. Header with `barter`.
2. Area selector: `Depok · 5 km`.
3. Search input: `Cari barang, makanan, atau toko`.
4. Tabs: `Barang` and `Toko sekitar`.
5. Category directory.
6. Filter and sorting toolbar.
7. Listing results.
8. Mobile bottom navigation.

Categories:

- Makanan
- Pakaian
- Rumah & furnitur
- Kendaraan
- Kebun
- Semua kategori

Use these fictional examples:

- `Kursi kayu bekas` — `Rp150.000 · Bisa ditawar`, `Beji · sekitar 2 km · Pribadi`.
- `Nasi kotak Dapur Bu Rina` — `Mulai Rp10.000/pcs · PO`, `Tutup 12 Sep · Ambil 13 Sep`, `Beji · sekitar 3 km · Toko`.
- `Bibit cabai` — `Gratis`, `Kukusan · sekitar 2 km · Pribadi`.

Each listing row shows a square thumbnail, title limited to two lines, price or offer mode, approximate area, approximate distance, publisher identity, and a visible `Dipromosikan` label when relevant. PO listings also show the order deadline and pickup date.

Use a single-column list on mobile. Desktop can use a wider classified list with a filter sidebar. Do not automatically turn the product into a three-column image grid.

### 2. Search results

Include a preserved search query, selected category, filter button with count, sort control, results caption, listing rows, loading skeleton, empty state, and error state.

The filter sheet contains category, radius, minimum price, maximum price, offer type, fulfillment type, Reset, and Terapkan. It needs a title, close action, visible selected values, and clear focus behavior.

Empty state:

`Belum ada penawaran yang cocok`

Actions: `Ubah filter` and `Ubah area`.

Error state:

`Penawaran belum dapat dimuat.`

Action: `Coba lagi`.

### 3. Listing detail

Order the content as Back, photo gallery with count, title, price or offer type, condition, defects, special terms, approximate area, publisher identity and reputation, handover method, report action, and a sticky contextual CTA area.

CTA examples:

- Jual: `Chat penjual`.
- Barter: `Ajukan barter`.
- Jual atau barter: `Chat penjual` and `Ajukan barter`.
- Gratis: `Hubungi pemberi`.
- PO: `Tanya pesanan`.
- Catering: `Tanya pesanan`.

Do not show Buy now, checkout, payment forms, or artificial urgency counters.

Show a generic unavailable state for reserved, hidden, deleted, or closed listings. Explain why a new agreement cannot start, while existing participants can still open their transaction.

### 4. Store profile and catalogue

Include store name, avatar, short description, rating and review count, approximate area, opening hours, handover options, catalogue search, and catalogue listings using the same listing-row component as the discovery feed.

Do not use a cover banner. Do not reveal a full address unless the store explicitly opts in.

### 5. Inbox and private chat

Inbox rows show the other person’s name, listing thumbnail and title, latest message, time, unread state, and store context when relevant.

The chat screen includes a back action, listing context header, counterpart name, block and report actions, message bubbles, timestamps, sent/read state, photo attachment preview, system cards for barter offers and orders, and a composer with a clear send action.

Do not add calls, WhatsApp redirection, message editing, unsend, or off-platform transaction prompts.

Use realistic Indonesian messages:

- `Halo, kursinya masih ada?`
- `Masih, bisa dilihat sore ini di Beji.`
- `Saya punya rak buku untuk ditukar. Mau lihat fotonya?`

### 6. Barter negotiation room

Include counterpart name, listing context, current agreement version, status indicator, `Penawaranmu`, `Penawaran [counterpart name]`, item details, condition notes, optional additional cash amount, approval status for each party, handover summary, timeline, and actions to edit the offer, approve, confirm receipt, and cancel.

Use this copy:

`Persetujuan berlaku untuk versi kesepakatan yang sedang ditampilkan.`

Confirmation dialogs must explain the action before the user confirms it.

### 7. Order and transaction room

Include order title, current lifecycle status, item summary, quantity, subtotal, shipping amount, total, direct payment explanation, deposit status when relevant, handover method, timeline, amendment state, manual refund follow-up, stuck transaction help panel, and contextual actions.

Use this explanation:

`Pembayaran dilakukan langsung ke penjual. Barter tidak menerima atau menahan uang.`

Do not imply that Barter processes or holds user money.

### 8. Create listing wizard

Create a four-step mobile-first flow with visible progress:

1. Penawaran
2. Detail
3. Ketersediaan dan penyerahan
4. Tinjau

Step 1 includes publisher choice, offer type, category, and ready-stock, PO, or catering mode.

Step 2 includes listing name, photos, description, condition, defects, barter preferences, price, negotiable option, and variants when applicable.

Step 3 includes quantity or quota, minimum order, unit, PO deadline, available date, deposit information, handover method, and service area.

Step 4 includes public preview, privacy indicators, validation summary, Save draft, and Publish listing.

Use permanent field labels, helper text, inline validation, upload progress, retry, remove-photo actions, and a primary photo selector.

### 9. Account

Include profile summary, My listings, My stores, My transactions, Notifications, Plus, Settings, and Sign out.

### 10. Notifications

Include unread and read states, notification type, related listing or transaction, timestamp, and clear action hierarchy.

### 11. Admin reports

Create a desktop-oriented admin queue containing a report list, status filter, case detail, listing context, transaction context, evidence summary, decision history, required decision reason, and actions such as resolve, restrict, or request follow-up.

Keep the admin screens related to the main product while making them more information-dense.

## Component system

Create reusable components and variants for:

- App shell
- Header
- Mobile bottom navigation
- Desktop navigation
- Search bar
- Area selector
- Category directory
- Tabs
- Filter sheet
- Sort control
- Listing row
- Store row
- Listing thumbnail
- Status badge
- Promotion label
- Primary button
- Secondary button
- Text button
- Icon button
- Input
- Select
- Textarea
- Checkbox
- Radio choice
- Progress stepper
- Chat bubble
- Agreement card
- Transaction card
- Timeline
- Dialog
- Empty state
- Error state
- Loading skeleton
- Notice panel
- Support chat panel

Use Auto Layout and component variants. Define consistent default, hover, focus, pressed, disabled, loading, error, unread, selected, and completed states.

## Content and language

All visible interface copy must use Bahasa Indonesia and plain, direct language. Avoid corporate jargon.

Use Indonesian currency formatting such as `Rp150.000`, `Rp10.000/pcs`, and `Gratis`.

Use these status labels where relevant:

`Aktif`, `Draft`, `Arsip`, `Selesai`, `Menunggu`, `Disetujui`, `Ditolak`, `Dipesan`, `PO ditutup`, `Tidak tersedia`, and `Dipromosikan`.

Add this visible preview label:

`Mode demo: data tidak dapat ditransaksikan.`

## Data and image rules

Use realistic but clearly fictional local demo content from Depok, Beji, Kukusan, and nearby Jabodetabek areas.

Use neutral placeholders or the supplied project assets for chair, bicycle, food, jacket, and plant categories. Do not present generated photos as real user-uploaded evidence. Do not create precise home addresses, phone numbers, payment receipts, or identity documents.

## Interaction and accessibility

- Make all important actions reachable with keyboard and touch.
- Keep touch targets at least 48 × 48px.
- Use visible focus states.
- Do not rely on color alone for status.
- Preserve search, filter, tab, and scroll state when returning from detail.
- Keep sticky action areas above the mobile safe area.
- Do not cover form fields when the keyboard opens.
- Give dialogs labelled close actions.
- Make long dialogs and filter sheets scroll internally.
- Support reduced motion.
- Connect error messages to the affected field or action.
- Never remove entered form text after an upload or server error.

## Generation instruction

Generate the complete multi-screen prototype in this document. Do not stop after creating the first screen.

If the generation has a screen or output limit, split the work into multiple batches while keeping the same visual system:

Batch 1: screen index, shared components, Home, Search results, and Listing detail.

Batch 2: Store profile, Inbox, Chat, and Barter negotiation room.

Batch 3: Order room, Create listing wizard, Account, Notifications, and Admin reports.

After each batch, continue to the next batch automatically. Do not replace the remaining screens with a single placeholder page. Every required screen must exist as a separate named frame or route before the task is considered finished.

## Acceptance criteria

The redesign is successful when:

- A user understands what Barter does within a few seconds.
- The home screen shows local listings immediately without a marketing hero.
- A user can compare title, price, distance, condition, and offer type without opening every listing.
- Barter, free, sale, PO, and catering flows look related but remain distinct.
- The interface feels local, practical, and trustworthy.
- Mobile screens work at 320px and 390px widths.
- Desktop screens remain a classified directory rather than a generic card grid.
- Important actions are obvious without being aggressive.
- No screen implies that Barter processes payments.
- Repeated UI elements use reusable components and consistent variants.
- Loading, empty, error, disabled, and completed states are represented.
