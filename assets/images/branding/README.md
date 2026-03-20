# Lensify logo previews (APK / store icons)

**Current app icon:** the custom teal low-poly eye art (copied to `../icon.png`, `../adaptive-icon.png`, `../splash-icon.png`, `../favicon.png`). A backup copy is `lensify-user-icon.png`.

Three **alternate** generated options you can swap in:

| File | Style |
|------|--------|
| `lensify-logo-preview-lens-ring.png` | Soft double-ring + eye curve (**default** — already copied to main icon assets) |
| `lensify-logo-preview-monogram-l.png` | Bold **L** monogram, blue–green gradient |
| `lensify-logo-preview-eye-iris.png` | Geometric iris / lens arcs |

## Switch the app icon

From the `contactlens` folder:

```powershell
# Example: use the monogram instead
copy assets\images\branding\lensify-logo-preview-monogram-l.png assets\images\icon.png
copy assets\images\branding\lensify-logo-preview-monogram-l.png assets\images\adaptive-icon.png
copy assets\images\branding\lensify-logo-preview-monogram-l.png assets\images\splash-icon.png
```

Rebuild your APK after changing icons.

## Sizes

Expo expects **1024×1024** for `icon.png`. These previews are generated at that intent; compress with [TinyPNG](https://tinypng.com) or similar before store release if needed.
