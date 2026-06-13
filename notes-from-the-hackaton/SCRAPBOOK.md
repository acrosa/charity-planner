# Hackathon experience task

While I wait for the agent to do the work I'm wrigint this task so Claude can generate a timeline page (inside the same deployed app) `/how-it-was-made` on the main report page we can add a small link atop that takes you to this (see how it was done) or similar. The page will be very visual and show a timeline of the events I took notes (fix the text I spent cero time writing coherently lol).
Then build the UI, if there are addresses or things we can augment visually do it (example on location show a small inline map, etc), code snippets syntax highlight into a small terminal ui, etc. this should be a FUN visually easy to read and high quality page to look and get a sense of how the hackathon took place and the decisions and suprises I had a long hte way. Not a lot of text, more visual and event based capturing my notes.

—Alejandro

## Scrapbook notes to use for the page:

9 arrived at **📍Location:** Shack15 (Ferry Building, 1, Suite 201, San Francisco, CA 94111) had to park far :sob:
9-10 Met a few people before the event kick-off good conversations, from agent evals to enterprise features and what everyone was going to work on
coffee 3D printed was so cool! sent a photo to my kid who 3d prints :)
The youtube live music for Claude FM coding is awesome https://www.youtube.com/watch?v=tRsQsTMvPNg
10-12:30 Spent ~2 hours writing the BRIEF.md, DESIGN.md and RUBRIC.md files based on previous ideas I had, third party services setup I did before the event (basically opening accounts on Fly.io, etc.)
12:30-13 had to run ~15min back and forth to re-pay the parking meter for my car :sob:—it's hot outside :hot:
13- Doubted if I wanted to use ultracode + workflows— a quick Claude Q&A revealed it was what I needed.
Fired the ultracode goal with:
```
 /goal let's work on the @BRIEF.md, read the @DESIGN.md and follow the @RUBRIC.md for verifying the work is done. The brief should have all instructions needed to get this into production and build with a high level of quality, we want to wow people on the demo in terms of quality. All the third-party services we need are already setup, so you can just iterate on the definitions and get the app deployed and working end-to-end. Note that the RUBRIC.md file **must pass all the verifications**.
  ⎿  Goal set: let's work on the @BRIEF.md, read the @DESIGN.md and follow the @RUBRIC.md for verifying the work is done. The brief should have all instructions needed to get this into production and build with a high level of quality, we want to wow people on the demo in terms of quality. All the third-party services we need are already setup, so you can just iterate on the definitions and get the app deployed and working end-to-end. Note that the RUBRIC.md file must pass all the verifications.
```
:shrug: let's wait and see
13:23 damn, I just got this already:
```
All services pass: claude-opus-4-8 ✓, web_search tool ✓, voyage-4 embeddings ✓ (1024-dim — matches my schema exactly), rerank-2.5 ✓ (ranks the food bank top for "feed hungry families"), Postgres 18.4 ✓ with vector 0.8.1 + pg_trgm 1.6 available, Fly auth ✓.
```
incredible.

13:25 looks like migrations run (see screenshot) we got the charities table created.

13:31 yay we got data on the table :party: (see screenshot)

13:33 ok Claude is now almost bragging on how it is:
```
99.36% embedded (9936/10000) — passes RUBRIC's ~9.5k threshold. One batch of 64 failed transiently. Since ingest is idempotent, a re-run will only backfill those 64. Let me do that quickly:

  Ran 1 shell command

100% embedded — all 10,000 charities with non-null embeddings. Task #5 done. Let me commit this milestone, then continue the pipeline.
```

13:36 The brief and rubric are paying off:
```
Retrieval is strong: Maria gets 7 CA food/education orgs, Chens correctly excludes religious (the religion-cause org dropped), Sam gets 10 wildlife orgs at 0.7-0.83 rerank. But "red cross" didn't surface American Red Cross — let me check whether it's even in the corpus and how the bare query behaves:
```

one small hiccup (not a big deal), one test wants a charity not on our 10k dataset:
```
American Red Cross simply isn't in this 10k subset (the rerank sensibly returns Magen David Adom — Israel's Red Cross equivalent — and blood centers). That's a corpus reality, not a bug; I'll align the sanity queries to orgs actually present. Retrieval core is solid. Now let me read the Daffy selection rules to build portfolio selection correctly:
```

13:39 got bored of waiting and want to start the scrapbook (this page) in a separate session:
```
let's read @notes-from-the-hackaton/SCRAPBOOK.md and let's imple,ent the page in isolation so we don't mess with the other agent implementing the main app in this same folder, this way we can iterate on this design
```
Excellent approach by Claude:
```
The clean solution is a git worktree — a separate working directory on its own branch. I get full isolation, my own dev server on a separate port, and a trivial merge back later. Let me check the git state and load the worktree tool.
```

13:46 last check for the data-pipeline before building the UX
```
Typecheck is clean across the whole backend. Now the critical validation: run the actual interview + recommend pipeline for the three scenarios and check RUBRIC assertions at the data level — before building any UI. Let me write a scenario harness:
```
things are moving fast.

13:47 OPus checking it's own docs to see how to argument itself is quite meta and a bit funny
```
temperature is deprecated for opus-4-8. Let me consult the claude-api reference to get the model's parameters right rather than guess:
```

14:04 Looks like the timeline of scrapbook notes works (this page). Looks great, will help people understand the process.

14:22 seems backend is ready and deployed, early results look good:
```
On Fly: 18.8s (vs minutes locally — confirming local network was the issue) and the report is excellent: top-3 portfolio $50/$30/$20=$100, 8 CA orgs, 0 political, first-person philosophy referencing her Oakland/food/education terms, specific why-lines, and the correct fork fund recommendation. The backend is demo-quality.
```

14:27 now it's running the eval (hardest most complex one against production)
```
Now the hardest scenario — S2 Chens (full mode, religious exclusion + Stanford stretch):
```


