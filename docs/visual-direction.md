# Typeflow visual direction

## Brief and constraints

Upgrade the current English typing animation generator to the restrained, mature quality of https://www.typeflow.studio/typing-animation-maker without duplicating its layout or brand identity. Keep all working editor controls, exports, saved projects, English content, domain metadata and 10 occurrences of the primary keyword in the static body.

The built-in image generation capability is unavailable in this session. No CLI fallback or external image API is authorized. The inspected live reference and this code-native design specification substitute for an image-generated concept; this is an intentional workflow deviation, not a user-approved image concept.

## Full-surface specification before implementation

- Navigation: quiet centered 1120px horizontal bar, 64px high, 1px neutral border, wordmark left, guide/format/FAQ links and an Open editor action right. No invented account, pricing, statistics or social proof.
- Hero: open centered typography on near-black, no badge or eyebrow; existing keyword H1 in two deliberate lines, 76px desktop / 44px mobile, a muted final line, 620px English description and two real actions. Do not turn the hero into a decorative image.
- Editor: a single framed, live 1240px workspace with 18px outside radius, thin border and subtle deep shadow; a 68px utility header, left canvas and right 360px inspector. Comfortable neutral workspace with no dotted grid. Preserve the rendered project and sizing semantics.
- App controls: 13px buttons and fields, 14px section titles, 12px captions, 44px primary control height. White selected surfaces and high-contrast primary actions; dark neutral secondary actions. Four existing tabs remain available.
- Guide: same 1120px gutters, 96px section spacing, 40px headings; editorial step columns with small neutral numbers, an open features layout, spacious format table and FAQ rows. Keep all existing factual claims and FAQ answers. No decorative card grid.
- Mobile: navigation collapses to wordmark and Open editor, 20px outer gutters, 44px hero title, paired actions, full-width preview and stacked inspector, 44px controls, no horizontal scrolling. All guide content stays available.
- Modal states: neutral surfaces, larger readable titles and body copy, two-column export format selector; 360px maximum viewport-relative width on a 390px screen. Existing cancel, close, filter, export and project interactions stay functional.
- Light theme: actual white main page and editor panels with cool neutral borders and black actions. Preserve the existing theme setting.

## Tokens and motifs

Background #0b0b0d; workspace #111114; inspector #151518; elevated #1d1d21; border #29292e; primary text #f5f5f7; secondary #a2a2ad; quiet #787883; primary action #f5f5f7 with #111114 text. TF Inter for page and controls, existing selected fonts for canvas. Spacing 4/8/12/16/24/32/48/64/96. Thin borders, restrained radii and generous open spacing carry the design. Existing Lucide icons remain outlined with consistent weight, 16px controls / 18px primary actions. No photographic asset is needed for this code-native tool.

## Allowed copy and interaction inventory

Keep all existing static body copy and editor labels. Changes allowed by this visual brief: split H1 into styled spans without changing its text; move section links to navigation; add Open editor and Explore templates actions; replace the duplicated editor wordmark with Editor; remove the decorative YOUR WORDS, IN MOTION eyebrow. No other above-the-fold marketing claims. Native code controls remain interactive; no screenshot is used in place of the editor.

## Visual QA ledger

Compared the live reference screenshot and final implementation using view_image. This verifies the written direction above; there is no accepted generated concept and no claim of exact fidelity to the reference.

| Point               | Result                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Headline hierarchy  | Large two-line centered H1 with muted second line; deliberately distinct from the reference's left-aligned single line.            |
| Navigation          | Restrained capsule, real section links and one high-contrast editor action.                                                        |
| Palette             | Near-black neutrals and white actions replace purple chrome; light theme checked too.                                              |
| Canvas and frame    | Live canvas and inspector share one border; dotted background removed.                                                             |
| UI typography       | Self-hosted Inter for chrome, larger controls, existing chosen fonts preserved on canvas.                                          |
| Section rhythm      | Spacious three-column steps/features, readable comparison table and split FAQ; mobile stacks.                                      |
| Responsive behavior | Native 1280x720 desktop screenshot; 1440px layout inspection; 390x844 mobile has no horizontal overflow and a 360px export dialog. |

Functional checks: hero template link opens the 24-template gallery; Terminal Letter and Quiet Monologue apply; text editing, Play/Pause, all four settings tabs, dark/light theme, FAQ expansion and export format selection work. Restored Quiet Monologue and Text tab. Export dialog verified; fresh MP4/WebM encoding and download completion were not retested for this styling change. Existing 13 automated tests and production build pass.

Above-fold copy audit: H1 text and SEO introduction retained; added Open editor and Explore templates; editor wordmark becomes Editor; removed YOUR WORDS, IN MOTION. All 10 exact primary-keyword occurrences remain in static body content. No invented marketing claims or social proof.

Intentional differences from reference: centered hero, embedded working editor, existing product capabilities and original guide content. No material layout mismatches remain against this written specification. The image-generation workflow remains unavailable as documented above. IAB resized JPEG captures were unreliable; final mobile and editor evidence uses CDP PNG capture from the same built-in browser, with fresh native desktop tabs where needed.

Final visual evidence: homepage-desktop.jpg, editor-desktop.png, homepage-mobile.png and faq-desktop.png in docs/design. Temporary faulty captures removed.

## First-screen demo follow-up

User requested an immediate demo matching the role of their supplied reference screenshot. This scoped update supersedes the earlier two-line desktop hero specification: compact single-line desktop H1, shorter hero spacing and a centered black preview before the full editor. Existing H1 wording, English introduction and keyword occurrences remain. New copy: three short demonstration sentences, Typing animation preview, and accessible pause/play labels. The independent demo has silent typing, hold, deletion and cycling; Pause/Play was browser-verified and reduced-motion starts paused.

Built-in browser and view_image inspection confirm the complete demo and caption fit both 1280x720 desktop (bottom 631px) and 390x844 mobile (bottom 618px), with no horizontal overflow. Compared title scale, hero spacing, CTA placement, preview proportions and caption treatment to the supplied reference; centered alignment and embedded editor below are intentional differences. No material layout issue remained. Evidence: hero-demo-desktop.png and hero-demo-mobile.png. Build and all 13 existing tests pass. Static keyword count stays 10 in 677 words.

## Dedicated editor page

User requested the editor as a separate full-browser page rather than a framed section. The homepage now contains only the hero demo and guide; its primary links navigate to /editor and its template link to /editor?templates=1. The new editor.html entry has its own title and self canonical. Server routes support direct loads and refreshes, with /editor/ and /editor.html redirected to /editor; unknown routes still return 404. Sitemap contains both public pages. The editor's top-left link returns home.

Desktop shell verified at x0/y0, 1280x720, matching the viewport with no document overflow, outer margin, border, radius or shadow. Header, canvas, timeline, inspector and actions remain in the same neutral design system. On 390px mobile the shell fills the page width, toolbar stays sticky and stacked content scrolls without horizontal overflow. Existing project text survives navigation and refresh. Playback, export dialog, homepage template entry with all 24 templates and mobile Canvas/Export controls were verified. All 14 tests and production build pass. Final evidence: fullscreen-editor-desktop.png. This supersedes the earlier embedded framed-editor specification.
