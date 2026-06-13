# Hackathon experience task

While I wait for the agent to do the work I'm wrigint this task so Claude can generate a timeline page (inside the same deployed app) `/how-it-was-made` on the main report page we can add a small link atop that takes you to this (see how it was done) or similar. The page will be very visual and show a timeline of the events I took notes (fix the text I spent cero time writing coherently lol).
Then build the UI, if there are addresses or things we can augment visually do it (example on location show a small inline map, etc), this should be a fun page to look and get a sense of how the hackathon took place and the decisions and suprises I had a long hte way. Not a lot of text, more visual and event based capturing my notes.

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

