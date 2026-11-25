# Hyperframes Composition Brief: Workflow Builder

## Objective
Create a ~60s premium launch-style brag film for Workflow Builder (a Weavy-style node-based LLM workflow canvas).

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080, 30fps
- Duration: 60s (user-requested; overrides the 15-25s default)

## Source Material
- Project root: `c:\projects\WorkFlow-Builder-Weavy`
- Primary files read: `extracted_doc.txt` (requirements), `app/globals.css`, `landing.html`, `lib/nodesConfig.tsx`, `lib/edge-style.ts`, `lib/starter-template.ts`, `lib/constant.ts`, `components/nodes/*`, `components/editor/{LeftSidebar,BottomControls,SidebarHistory}.tsx`, `components/editor/history/RunCard.tsx`
- Product name: Workflow Builder
- Tagline / strongest claim: "Artistic Intelligence." (landing hero)
- Key UI to recreate: node cards (NodeShell), animated coloured edges, pulsating lime run glow, left sidebar icons, bottom controls, MiniMap, LLM inline response, Workflow History RunCards + node tree.
- Copy that must appear verbatim:
  - "Artistic Intelligence."
  - Node names: "Enter Text", "Upload Image", "Upload Video", "Run any model", "Crop Image", "Extract frame from video" (sidebar tooltips) / node titles "Google Gemini LLM", "Crop", "Extract Video Frame"
  - "Product Marketing Kit Generator"
  - "Workflow History", "Gemini Response", "Run Model", "Run Workflow"
  - Sample prompts from `lib/starter-template.ts`
  - History example from the spec: "Invalid timestamp parameter"

## Creative Direction
- Tone preset: cinematic
- Creative direction: crazy After-Effects-grade motion that stays simple, sleek, elegant and premium; show all features; ~1 minute.
- Interpretation: big motion in transitions and camera (whip, zoom-through, light sweep, RGB-split hit, motion blur); titles land and hold dead still; one accent colour.
- Angle: the canvas is already a motion graphic — glowing typed wires and pulsing running nodes — so treat it like a title sequence in one continuous dot-grid world.
- Hook: three coloured wires whip in and snap into a lime handle; "Artistic Intelligence." resolves per word.
- Outro: feature chips stack on beat, fold into the wordmark "Workflow Builder" + "Artistic Intelligence."
- Avoid: generic SaaS language, abstract filler, redesigning the UI, impersonating the official Weavy brand.

## Visual Identity
- Background: #08080a; canvas dots #2a2a31 on #0c0c0f
- Panels: #212126, border #302e33, inputs #1c1b1f, deep #17161a
- Text: #f2f0f8; muted #9a9ab0
- Accent: #f7ffa8
- Edges: text #f1a0fa, image #45a08a, video #ea8362
- Display font: Plus Jakarta Sans (assets/fonts, variable)
- UI font: DM Sans (assets/fonts, variable); mono JetBrains Mono (bundled); body Inter (bundled)
- LOOK: dark studio canvas at #08080a, dot grid 36px pitch 2.4px dots, single lime #f7ffa8 accent at full saturation on focal elements and 18-22% for ambient glow (radial, never full-screen linear), panels with 1.5px #302e33 borders and 12px radius scaled ~1.6x from web. BANNED: floating/breathing title loops, generic gradients, click rings, every scene fading up.

## Storyboard
Creative contract: `brag-output/brag-plan.md`.
1. Hook — 0–4.64 — wires converge; "Artistic Intelligence."
2. Reveal — 4.64–9.83 — editor builds; "A node-based LLM workflow builder."
3. Six nodes — 9.83–19.64 — six node cards land; "Six nodes. One canvas."
4. Connect — 19.64–27.83 — typed edges, refused image→prompt, refused cycle
5. Run — 27.83–38.74 — sample workflow, parallel glow, convergence
6. Inline Gemini — 38.74–45.82 — response types on the node
7. History — 45.82–52.38 — run list + node-level tree
8. Outro — 52.38–60 — feature chips → wordmark

## Audio
- Audio role: cinematic support, rhythmic middle
- Music: `assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` at ~0.38, fade-out last 1.5s
- Music cue guidance: bundled preset (vol-10). Strong cue locks 19.64 / 45.82 / 55.11. Beat grid for sidebar icons (every beat), node cards (every other beat), chips (every beat, then hold).
- Audio-reactive treatment: subtle; RMS + bass drive the ambient lime glow and dot-grid brightness on the persistent background layer.
- SFX: card slides on whips, drops on cards, switch/click on connects and Run, error buzz on refusals, keypress ticks on typing, one bell on the wordmark. Use low-HF-risk picks from `sfx-analysis.md`. Volumes 0.5-0.8.

## Hyperframes Instructions
Built with the hyperframes skill bundle shipped in the CLI (`hyperframes@0.8.210`): one sub-composition per scene plus a persistent background scene; `check` is the gate; render locally.
