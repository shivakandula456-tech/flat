# Testing notes

## Environment

- Google Chrome 155.0.8059.85, headless, Windows.
- Desktop viewport: 1440 × 900.
- Mobile viewport: 390 × 844 at device scale factor 2, applied with Chrome DevTools Protocol device emulation and page reload.
- Hardware WebGL 2 through ANGLE: Intel UHD Graphics 620, Direct3D11.
- Local runtime: `tools/serve.ps1` over HTTP; module loading also checked from a local `file://` URL with Chrome file access enabled.
- Test harnesses are external to the deliverable and are not referenced by the site.

## Automated and scripted checks

| Check | Result |
| --- | --- |
| Page loads without JavaScript errors or unhandled rejections | Pass |
| Three.js viewer reaches ready state and hides its loader | Pass |
| WebGL fallback stays hidden when WebGL is available | Pass |
| Six room chips, six scene labels, six SVG rooms | Pass |
| Fourteen plan objects and six plan labels render | Pass |
| Six chapters, five reference frames and nineteen evidence rows render | Pass |
| Camera presets update the 3D view and pressed states | Pass |
| Selecting a room in one view synchronizes the 3D model, SVG plan, room index and dossier | Pass |
| Chapter click seeks and plays the correct chapter; only the current chapter is highlighted | Pass |
| Reference-frame dialog opens with loaded image, title and timestamp, and closes cleanly | Pass |
| Mobile navigation opens, closes from an anchor link and releases the body lock | Pass |
| Mobile document width equals viewport width at 390 px | Pass |
| Mobile plan scrolls horizontally inside its own stage without widening the page | Pass |
| Responsive layout at 1024, 768 and 641 px has no page-level horizontal overflow | Pass |
| WebGL unavailable fallback shows useful content and disables camera controls | Pass |
| Keyboard selection of plan rooms and dialog Escape handling | Pass |
| HTTP delivery with correct JS, CSS, image and ranged-video responses | Pass |
| No-JavaScript banner appears and source video remains present | Pass |

## Key measurements

- Desktop viewer canvas: 945 × 463 CSS pixels at the tested viewport.
- Mobile page width after the plan fix: `innerWidth = 390`, `document.documentElement.scrollWidth = 390`, `body.scrollWidth = 390`.
- Mobile plan card: 350 px wide; plan stage: 321 px visible with 496 px scrollable content and the explanatory swipe hint.
- Mobile dialog: 366.6 px wide with a 364.6 px image; no horizontal page overflow.
- At 1024 × 900 the walkthrough remains two-column; at 768 × 1024 and 641 × 900 it becomes single-column. The plan stage fits without internal scrolling at 768 and 641 px.
- Cold viewer readiness in a fresh profile: approximately 16 seconds; repeated runs with a warm profile: approximately 2.0–4.7 seconds.

## Interaction and fallback checks

- Focusing the bedroom SVG room and pressing Enter selected it and synchronized the plan room, room chip and dossier.
- Keyboard activation of the far-zone reference frame opened the native dialog with the close button focused. Escape closed it and returned focus to the originating frame card.
- On the emulated mobile viewport, the menu opened and locked body scroll; Escape closed it, restored `aria-expanded="false"`, released the body lock, and returned focus to the menu button.
- With WebGL disabled, the loader cleared, the fallback panel became visible, the status changed to "3D model unavailable", the SVG plan remained interactive and the video remained playable. Camera controls were disabled.
- With JavaScript execution disabled, the fixed no-script banner appeared and the video source remained in the document.
- The HTTP preview returned `200` for the page, scripts, styles, images, video and Markdown documentation. A byte-range request for the MP4 returned `206` with the correct `Content-Range`.

## Known gaps

- Automatic checks have run in Chrome only. Safari, Firefox and real iOS/Android hardware have not yet been tested.
- The walkthrough is a vertically oriented 512 × 910 clip; on wide screens the player intentionally letterboxes it. The surrounding layout has been sized to keep the footage prominent.
- Performance was measured on one hardware-accelerated Windows machine. Integrated-GPU, low-memory and software-rendering devices may initialize more slowly.
- No formal screen-reader audit or automated WCAG scanner has been run. Keyboard and focus behavior have been checked for the plan, frame dialog and mobile menu.
- Visual comparison against the source is necessarily subjective because no measured survey exists. The evidence register records the observations and uncertainties.
