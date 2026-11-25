# Brag Plan: Workflow Builder

## What is this app?
A node-based LLM workflow canvas (a Weavy-style clone): drag six node types onto a React Flow canvas, wire them with type-safe animated edges, and run the whole DAG — every node executes as a Trigger.dev task, Gemini answers inline on the node, and every run lands in a node-level history.

## The angle
The product *is* a motion graphic waiting to happen: glowing purple/teal/orange wires, a lime-selected node, nodes that literally pulse while they run. So the film treats the canvas like a premium After Effects title sequence — wires whip across black, a dot-grid world that never cuts, and the real "Product Marketing Kit Generator" sample workflow running in parallel branches before converging. Sleek and dark, but every big move hits the drop.

## Hook (first 2-3 seconds)
Black frame. Three coloured wires (purple text, teal image, orange video — the app's real edge colours) whip in from the edges with motion blur and snap into one lime handle dot dead-centre. The dot flares, and the landing page's own headline resolves word by word: **"Artistic Intelligence."**

## Key moments (the middle)
- The left sidebar's six Quick Access icons pop out one by one and become the six real node cards (Text, Upload Image, Upload Video, Run Any LLM, Crop Image, Extract Frame).
- On the drop: edges draw themselves between nodes with marching dashes; an image wire tries to plug into "System Prompt" and is refused in red; a loop-back wire is refused as a cycle.
- The sample workflow runs: Branch A and Branch B nodes glow **at the same time** (the pulsating lime glow from the app), phases tick 1 → 4, and LLM #2 waits until both branches land, then fires.
- LLM node expands and the Gemini response types out inline, right on the node.
- Right sidebar slides in: Workflow History with Full / 2-nodes / Single runs, one expands into the node-level tree (✅ timings, ❌ "Invalid timestamp parameter").

## Outro / punchline
Rapid feature chips stack on the beat (Clerk auth, Undo / Redo, JSON export / import, PostgreSQL + Prisma, Zod-validated APIs, MiniMap), collapse into a lime node, and the wordmark lands: **Workflow Builder** — "Artistic Intelligence." Hold, music tails out.

## User flow worth showing
1. Add nodes from the left sidebar onto the dot-grid canvas.
2. Connect them (type-safe, DAG-validated) into the Product Marketing Kit workflow and press Run Workflow.
3. Watch parallel branches glow, Gemini answer inline, then inspect the run in Workflow History.

## Tone
- Preset: cinematic
- Creative direction (user): "crazy vid… crazy after effects and animations, simple sleek elegant at the same time, premium, show all the features, around 1 min"
- Interpretation: trailer-scale moves (whips, zoom-throughs, light sweeps, RGB-split hits, motion blur) on a restrained, dark, single-accent palette. Big motion lives in transitions and the camera; titles land and hold dead still. Feature density is high, so each scene carries one read at a time.

## Format: landscape — 1920x1080
## Duration: 60s (user-requested ~1 min; overrides the 15-25s default by explicit request)

## Visual identity (from the project)
- Background: #08080a (landing `--bg-black`), canvas dots on #101014
- Panels: #212126 (`--sidebar-background`), border #302e33, input #1c1b1f
- Accent: #f7ffa8 (`--yellow-bg`, selection / run button / scrollbar)
- Text: #f2f0f8 (`--sidebar-foreground`), muted #9a9ab0
- Edge colours: text #f1a0fa, image #45a08a, video #ea8362 (`lib/edge-style.ts`)
- Status: emerald #34d399 Done, rose #fb7185 Failed, amber #fbbf24 Running (RunCard)
- Display font: Plus Jakarta Sans 800 (landing `--font-display`)
- UI font: DM Sans (node titles); mono: JetBrains Mono (landing mono); body: Inter
- Strongest visual element: animated coloured edges + the pulsating lime glow on running nodes

## Share copy (draft)
Built a node-based LLM workflow canvas: six nodes, type-safe wires, parallel DAG execution on Trigger.dev, Gemini answering right on the node.

## Audio direction
- Role: cinematic support with a dense rhythmic middle
- Music: happy-beats-business-moves-vol-10 (60.00s, ~110 BPM) — exactly the film length
- Music treatment: starts at 0, full bed ~0.38, short fade-out over the last ~1.5s under the wordmark
- Music cue guidance: preset `assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`. Strong cues to lock: 19.64s (drop → connection scene), 45.82s (history panel slam), 55.11s (wordmark). Beat grid for sequences: sidebar icons 5.74–8.73 (every beat, icons are non-text accents), node cards 10.38→16.38 every other beat (~1.09s each, text), feature chips 52.93→55.66 (hold the full set after).
- Audio-reactive treatment: subtle; music RMS/bass breathes the lime ambient glow behind the canvas and the dot-grid brightness. No waveform/equalizer visuals.
- SFX posture: moderate, motion-matched; whoosh-like card slides on scene moves, drops on node cards, clicks on the Run button, key ticks on the Gemini typing, one bell on the wordmark.
- Audio-coupled moments: icon/node card sequence, refused connections (error buzz), Run click, typing response, history slam, chip stack, wordmark.
- Restraint rule: no SFX on every beat; never stack more than two hits; bell only once.

## Storyboard

### Scene 1 — Hook: wires → "Artistic Intelligence." — 0.00–4.64 (4.64s)
Black. Three wires whip in (purple, teal, orange) with motion blur and converge on a lime handle dot; dot flares; headline blurs in per word and holds ~1.8s.
Sequential/interaction: wires arrive one after another (0.27 / 0.82 / 1.37 beats).
Audio intent: tension into release. Audio-coupled idea: card-slide whoosh per wire, soft impact on the flare.
Music: bed from 0. Transition mood: dramatic → zoom-through the dot.

### Scene 2 — Reveal: the editor builds — 4.64–9.83 (5.19s)
Zoom through the lime dot into the editor: dot-grid canvas, left sidebar with the Cloud logo and six icons popping in on beats, bottom controls (select / hand / undo / redo / 100%), MiniMap bottom-right. Caption: "A node-based LLM workflow builder." + mono stack line "React Flow · Gemini · Trigger.dev".
Sequential: 6 sidebar icons on consecutive beats (accents, not text).
Audio: drops on first and last icon. Transition: clean push → Scene 3.

### Scene 3 — Six nodes — 9.83–19.64 (9.81s)
Header "Six nodes. One canvas." Each sidebar icon fires out to a real node card landing in a 3×2 grid, every other beat, each holding its name + one spec line: Text (textarea, text out), Upload Image (jpg/png/webp/gif via Transloadit), Upload Video (mp4/mov/webm/m4v), Run Any LLM (Gemini · system / user / images), Crop Image (x / y / w / h % · FFmpeg), Extract Frame (timestamp or 50% · FFmpeg). Full set holds ~2s.
Audio: card-place per card (soft). Transition: whip on the drop → Scene 4.

### Scene 4 — Connect: type-safe, DAG-only — 19.64–27.83 (8.19s)  [beat-locked 19.64]
Nodes snap into a flow; edges draw with marching dashes in their data colours. Title "Type-safe connections." An image wire reaches for "System Prompt" → red, shakes, refused: "image → prompt · blocked". Then a wire loops back → "Cycle detected · DAG only". Title swap: "Validated as you wire."
Audio: switch clicks on connects, error buzz on refusals. Transition: zoom out to the full sample workflow.

### Scene 5 — Run: parallel branches — 27.83–38.74 (10.91s)
The sample "Product Marketing Kit Generator" laid out: Branch A (Upload Image → Crop → LLM #1 with two text nodes), Branch B (Upload Video → Extract Frame 50%), convergence LLM #2. Cursor clicks "Run Workflow". Phase rail 1→4: Branch A and B nodes glow lime simultaneously; LLM #2 shows "waiting for 2 inputs", then glows. Captions: "Independent branches run in parallel." → "Every node is a Trigger.dev task."
Audio: click on Run; soft pulses on phase changes. Transition: camera dives into LLM #2.

### Scene 6 — Gemini answers on the node — 38.74–45.82 (7.08s)
LLM #2 large: model "Gemini 3.5 Flash", two reference image slots filled (cropped headphones, video frame), System chip, then "Gemini Response" types a tweet-length post (fictional sample output about the template's headphones: noise cancellation, 30-hour battery, foldable design). Side caption: "Results render inline. No output node."
Audio: key ticks while typing (thinned). Transition: history panel slams in.

### Scene 7 — Workflow History — 45.82–52.38 (6.56s)  [beat-locked 45.82]
Right sidebar slides in: "Workflow History · 3". Run #125 Single Node ✅, #124 2 nodes selected ✅, #123 Full Workflow (partial). #123 expands into the node tree from the brief (Text ✅ 0.1s, Image ✅ 2.3s, Crop ✅ 1.8s, LLM ✅ 4.2s, Extract Frame ❌ "Invalid timestamp parameter"). Caption: "Every run. Every node. Persisted to Postgres."
Audio: slide whoosh; tiny drops on rows. Transition: rows collapse into chips.

### Scene 8 — Feature burst + wordmark — 52.38–60.00 (7.62s)  [beat-locked 55.11]
Chips stack on the beat: Clerk auth · Undo / Redo · Export / Import JSON · PostgreSQL + Prisma · Zod-validated APIs · MiniMap & fit view. Hold, then they fold into a lime node; wordmark "Workflow Builder" lands with an RGB-split hit, sub-line "Artistic Intelligence." Hold ≥2.5s, music fades.
Audio: chip ticks on first/last, one bell on the wordmark.

**Music mood for this video:** upbeat-cinematic
**Audio summary:** a punchy 110 BPM bed that builds through the reveal, drops into the connect/run section, and tails out under a single bell on the wordmark.

## Grounding notes
- Every capability on screen comes from `extracted_doc.txt` requirements implemented in the repo (nodes, Trigger.dev tasks, history, DAG/type-safety, undo/redo, export/import, Clerk, Prisma/Postgres, Zod, MiniMap).
- The Gemini response text and run timings are fictional stand-ins (timings copied from the spec's own example tree). No real user data, URLs, keys or emails appear.
- The product is presented under its package name "Workflow Builder" rather than as the official Weavy brand.
