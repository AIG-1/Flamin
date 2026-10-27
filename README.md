# Flamin Chicken & Gyro — Concept Site

Static site + Decap CMS admin. No build step. All content lives in `/content/*.json` and is edited at `/admin`.

## Deploy (browser only)
1. GitHub → New repo (e.g. `AIG-1/FlaminChickenGyro`) → "uploading an existing file" → drag the **unzipped folder contents** → Commit to `main`.
2. Netlify → Add new project → Import from GitHub → pick the repo. Build command: *(blank)*. Publish directory: `/` (root).
3. Netlify → Project configuration → Identity → Enable. Registration: **Invite only**. Services → Git Gateway → Enable.
4. Identity → Invite users → your email (and later the owner's). Accept the email → set password → you land on `/admin/`.
5. If the site name isn't `flaminhazelcrest`, update `site_url` in `admin/config.yml`.
6. Netlify → Forms → confirm "catering" appears after the first submission; add a notification email under Forms → Notifications.

## Admin sections
- **Restaurant Settings:** name, logo, mural background, phone, address, hours, holiday notice, announcement bar, Halal badge, order links, homepage video, SEO
- **Homepage Banner:** slides; each links to a menu item by its Item ID
- **Menu:** add/edit/delete categories and items, photos, sizes/prices, sold-out, featured, tags, per-item order links
- **Specials:** auto show/hide by start and end date
- **Photos & Videos:** gallery

## Notes
- Video uploads: keep MP4 under ~20 MB (Git Gateway limit risk). For longer video, upload to YouTube and paste the link.
- Never touch `/content/*.json` by hand once the owner is editing in admin; re-upload only HTML/CSS/JS files.
- Dirty Dog price unconfirmed (shows "Price coming soon"). Chicken Cheese Steak Large ($14.99) read from a blurry photo; confirm.
- Homepage video and 3 gallery items are Instagram embeds (no download). Swap to an uploaded MP4 anytime in admin.
- Order buttons: DoorDash and Toast only (no Grubhub listing).
- Reviews are posted only after approval: visitors submit via the "review" form (Netlify Forms), owner copies approved ones into Admin > Reviews.
