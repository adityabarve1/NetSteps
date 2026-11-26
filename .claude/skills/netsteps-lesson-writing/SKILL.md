---
name: netsteps-lesson-writing
description: Use when writing or editing NetSteps lesson text, captions, quiz questions, glossary definitions or cheat sheets. Gives the 10-part lesson recipe, the plain-language rules, an analogy bank, quiz-writing rules and an accuracy checklist.
---

# Writing NetSteps lessons

Audience: beginners and students with no networking background. Full theory with no length limit, but never a wall of text. Accuracy comes before simplicity: simplify the wording, never the truth. The code side (files, registration, tests) is in the `netsteps-coding` skill.

## The 10-part recipe (spec §7), in this order

1. **Hook**: one or two sentences, a real situation ("You press Play and the video starts in a second. What just happened?").
2. **Analogy**: one everyday comparison, then say where it stops being true.
3. **Learn**: at least 5 titled sections. Cover: what it is, why it exists, how it works step by step, the details and numbers, common mistakes and myths. Every section has a diagram, a simulation or a worked example. Technical depth (header fields, formulas, edge cases) goes in collapsible "Go deeper" blocks, so beginners can skip it. Add a table of contents (it comes from section titles, so make the titles specific).
4. **Watch it**: step-through simulations placed inside the theory where they explain best. One caption per step, one idea per caption.
5. **Try it**: at least one control the learner changes (slider, toggle, input, "break this link"), with the result shown immediately.
6. **Practice lab**: a guided browser lab, plus an "On your own computer" exercise where it fits (safe, read-only commands only, with sample output, a "what this means" note and the line "use this only on your own device and network").
7. **Why it matters**: where this shows up in real life.
8. **Quiz**: 5 questions (rules below).
9. **Recap**: "In one line", 3 to 5 bullet takeaways, and a small cheat sheet the learner can keep.
10. **Next lesson** link.

Target 8 to 30 minutes per lesson (`minutes` in the curriculum).

## Language rules

- Short sentences, aim under 20 words. About 8th-grade reading level for core text. Active voice. Say "you" and "your computer".
- Define every technical term the first time it appears, and wrap it in `<Term id="...">` with a glossary entry. Introduce new terms gradually: no more than two or three new terms in one paragraph.
- Never use a term before it is defined, and never define a word with another undefined word.
- Examples use realistic values: `192.168.1.0/24`, host `192.168.1.10`, gateway `192.168.1.1`. For public-internet examples use the documentation ranges `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` and domain `example.com`. Private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- Plain English, no hype, no jokes at the learner's expense, no "simply" or "just" or "obviously".
- Do not copy text, code or images from other sites or courses. Write it fresh.
- Headings are specific ("Why a switch beats a hub"), not vague ("More details").

## Analogy bank

Use one per lesson. Always add the limit of the analogy.

| Idea                           | Analogy                                            | Where it breaks                                              |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| Network, addressing            | Houses on streets, each with a unique address      | Addresses can change; a device can have several              |
| Packets                        | A long letter split into numbered postcards        | Postcards may arrive out of order and some are lost and resent |
| Packet vs circuit switching    | Postal mail vs a phone call holding a line         | Packets share links; a circuit reserves capacity             |
| Bandwidth                      | Number of lanes on a highway                       | Wider road does not make the trip shorter                    |
| Latency                        | Length of the road, the travel time                | Includes waiting in queues, not only distance                |
| Client-server                  | Restaurant: diners order, the kitchen serves       | A server can also be a client of another server              |
| Peer-to-peer                   | Neighbors swapping tools                           | Peers join and leave without notice                          |
| Switch                         | A mail room clerk who learns which desk is which   | Learns by watching; starts with no knowledge                 |
| Router                         | Road junction signs pointing to the next town      | Routers decide hop by hop, no whole-route map                |
| Topology                       | Seating plan: a row, a table, a circle, everyone talking to everyone | Physical cabling can differ from logical flow   |
| LAN / WAN                      | Your building vs the road system between cities    | Boundaries are rules of thumb, not law                       |
| Ports (later levels)           | Apartment numbers inside one building address      | A port is a number, not a place                              |

## Quiz rules

- Exactly 5 questions per lesson, 3 or 4 options each (the `QuizQuestion` type: `id`, `prompt`, `options`, `correctIndex`, `explanation`).
- One clearly correct answer. No "all of the above" or "none of the above". No trick wording and no double negatives.
- Wrong options are plausible mistakes a beginner would really make (mix up bandwidth and latency, treat the internet as the web). Never silly or obviously absurd.
- Vary the position of the correct answer across the five questions.
- Test understanding, not memorized words: at least two questions ask the learner to apply an idea to a small scenario or a number.
- `explanation` states why the right option is right AND why each other option is wrong, in one or two short sentences each.
- Every question maps to something the lesson actually taught. Never test a fact the lesson did not cover.

## Accuracy checklist (do this before finishing every lesson)

- [ ] Every number is correct and has its unit: bits vs bytes (8 bits = 1 byte), Mbps vs MB/s, ms vs s, KB = 1000 bytes in this course (say so if it matters).
- [ ] Every protocol name, acronym and port number is spelled and expanded correctly on first use (ICMP, ARP, DHCP, TCP, UDP; HTTP 80, HTTPS 443, DNS 53, SSH 22, SMTP 25).
- [ ] Every behavior claim matches how real networks work. Example: a plain PC does not forward traffic between two cables; a single ring breaks if one link breaks; a broken bus backbone stops everyone.
- [ ] Worked examples are recomputed by hand and match the `logic.ts` output and its tests.
- [ ] Simulation captions agree with the theory text and with the lab.
- [ ] Simplifications are labelled as simplifications ("In real networks there is more to it; see Go deeper"), never left as false statements.
- [ ] "Common mistakes and myths" names real misconceptions (internet is not the web, bandwidth is not speed, Wi-Fi is not the internet).
- [ ] Real-computer exercises give the right command for Windows and for macOS/Linux, show believable sample output, and are safe, read-only and limited to the learner's own device.
- [ ] Glossary definitions are correct, short and use no undefined jargon.
- [ ] If you are not sure of a fact, check a primary source (an RFC or vendor documentation) or leave it out. Do not guess.

## Level 1 lesson template (from `what-is-a-network`)

Read `src/content/lessons/level1/what-is-a-network/` before writing; match its tone and shape.

- **Hook**: two sentences, a real moment, ending on a question. **Analogy**: one paragraph mapping every part (houses = devices, roads = links, junctions = switches/routers, street address = IP address), then a second paragraph "Where the comparison stops working: ...".
- **Sections**: as long as the idea needs; `what-is-a-network` has 6 sections of roughly 300 to 600 words of core text each, split by `h3` subheadings into 2 to 4 short chunks. Each section has one concrete thing to look at: a table worked example, a sim, a diagram or a numbered scenario ("one evening, one home network"). Define a term with `<Term>` the first time, at most 2 or 3 new terms per paragraph.
- **Go deeper**: 1 or 2 per section, 2 to 4 short paragraphs or a list, titled as a specific claim or question ("How a switch learns which way to send"). Use them for engineer vocabulary, history, numbers and edge cases, and say which later Level covers it in full.
- **Simplifications**: state them, label them "for now", and point to the later lesson by topic ("the lesson on packet and circuit switching"), never by a link to an unbuilt page.
- **Sim captions**: one full sentence or two per step, present tense, naming devices by their on-screen names, saying what moves and why ("SW1 is a switch: it passes the message on toward PC2."). Failure captions say what is missing and what would fix it. Put the sim inside the section it explains, followed by "Notice three things:" bullets.
- **Try it**: under a minute, checkboxes or a slider, a verdict in a `role="status"` box that starts with a word ("Network" / "Not a network") as well as a colour.
- **Lab intro**: one paragraph goal, numbered steps using the exact button labels of the builder, the exact values to type, what success looks like, and a "Break it on purpose" invitation.
- **Real computer**: first sentence "Only do this on your own device and network."; Windows, macOS and Linux commands; believable sample output in `<pre>`; a bullet per output line saying what it means. Avoid `localhost`.
- **Myths**: 5 to 7 real misconceptions as Myth/Fact cards; add a troubleshooting checklist Go deeper that reuses the lesson's failure reasons.
- **Cheat sheet**: a 3-column table (Term, What it is, Example), 8 to 10 rows.
- British spelling (fibre, neighbour, organisation), as in the rest of the code base.
- **Names**: when the lab uses names (PC1, PC2), the instructions, the goal descriptions and the checks all use the same names.
- **Checklist additions** (from the review of this lesson):
  - [ ] Re-count every "two of them" / "all three" style claim in quiz explanations against the actual options.
  - [ ] Check every "you will also see" claim against the exact command shown (`ifconfig en0` prints only en0).
  - [ ] Define every word the lab uses (gateway, subnet mask, ...) before the lab, or explain it where the lab uses it.
  - [ ] Keep recap and myth wording consistent with the sections (not every network uses IP: phone plus Bluetooth earbuds is a network).
  - [ ] Search the folder for the banned words (simply, just, obviously, easy, of course, clearly, basically).
