# Pomf-Drive Hybrid — Roadmap (planned features)

This is a **lean, “paper-airplane” middle ground** between a one-click Pomf uploader and a full Nextcloud/Drive.  
Focus: **fast upload + fast browse + great preview + good sharing**, without becoming an elephant.

## Product principles
- **Keep it snappy**: low-latency UI, progressive loading, minimal “waiting” states.
- **One share surface**: `/s/:id` is canonical for link sharing + embedding.
- **Private by default (for accounts)**: sharing should be explicit and auditable.
- **Composable primitives**: upload targets, permissions, share links, view URLs, previews.

## Now (next 1–2 weeks)
- **Unified media viewer**
  - One viewer for **image/video/audio/document/text**, consistent actions: download, open, copy share, info.
  - Folder context navigation: **next/prev** within current folder/share.
  - Consistent mobile behavior (swipe, safe areas, keyboard shortcuts on desktop).

- **Share/Embed polish**
  - Add an **embed mode**: `/s/:id?embed=1`
    - Minimal chrome, optimized OG meta, works in iframes where allowed.
  - Improve `/embed/:id` HTML rendering to match the viewer and support private-share expiry UX.

- **My Files ergonomics**
  - Keyboard navigation, selection model, multi-select.
  - Context menu actions: rename, move, delete, share, copy direct link, copy share link.

## Next (2–6 weeks)
- **Open-Dropbox uploads (“upload to a folder”)**
  - Owner can create an **Upload Link** for a folder: “anyone with link can upload”.
  - Modes:
    - **Anonymous**: no identity captured; optional rate limits + CAPTCHA.
    - **Authenticated**: uploader identity captured; optional allowlist.
  - Controls:
    - Max size, allowed mime types, max files per hour/day.
    - Optional password + expiry.
    - Optional “requires approval” (uploads land in a pending state).

- **Shareable folders that feel like albums**
  - Grid/list layouts, sorting, EXIF display for photos.
  - Optional watermarking and download toggles.
  - Per-share permissions: view-only vs allow-download.

- **Better uploads**
  - Drag-drop folders, resumable uploads, clearer per-file status.
  - Client-side hashing to detect duplicates (optional).

## Later (6+ weeks)
- **Permissions & roles**
  - Folder ACLs: owner/admin/viewer.
  - Team spaces (shared root) without full enterprise complexity.

- **Search**
  - Filename + metadata search; filters by type/date/size.
  - Optional content indexing later (PDF/text).

- **Collections / smart views**
  - “All photos”, “Recent uploads”, “Large files”, “Unshared private”.

## Technical workstreams (supporting)
- **Preview pipeline**
  - Ensure previews are path-consistent (relative `previewKey` joining), robust across shards.
  - Smarter transcoding priority: newest-first for UI, background sweep for orphans.

- **Serving correctness**
  - Harden MIME, range requests, caching headers.
  - Avoid Chrome `OpaqueResponseBlocking` issues (validate content-type + CORP/COEP where needed).

- **Share surface contract**
  - `/file/view-urls` remains the single contract for “what URL should the client use”.
  - Shares should return both **canonical `/s/:id`** and **direct URLs** (where allowed).

## UX “spice but lean”
- **Progressive image loading everywhere** (blurhash → low-res → full-res).
- **Auto quality video (ABR) + manual override**, remember last choice per device.
- **Drive-like gestures**
  - Single click select, double click open
  - Spacebar quick preview
  - Arrow key navigation

## Open questions (to decide early)
- **Share IDs**: should `/s/:id` accept both cuid+uuid+encoded ids long-term, or enforce one canonical format?
- **Upload-to-folder security**: do we require CAPTCHA for anonymous? what are default limits?
- **Embed policy**: allow iframes for all shares, or only explicit “embeddable” shares?

