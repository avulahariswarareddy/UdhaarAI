# Notices

## The guide character

The reference sheet supplied for the demo guide is drawn in the visual style of
Greg Heffley from *Diary of a Wimpy Kid* — the stick limbs, the two hair tufts,
the round nose, the open oval mouth. That character and its style are the
copyrighted work of Jeff Kinney and Abrams Books.

Shipping a close likeness on a **publicly linked** competition entry is a real
risk, not a theoretical one: it is exactly the kind of thing that gets a
submission disqualified or a takedown notice, and the resemblance is close
enough that a judge who grew up on those books will notice immediately.

So the guide in `src/components/Guide.tsx` is **original artwork**, drawn as SVG.
It is deliberately friendly and hand-drawn in feel, with the fourteen poses that
were asked for, but it is not a copy of anyone's character.

Being SVG rather than a bitmap also means it scales to any screen without
blurring, animates on the compositor, recolours with the brand, and adds nothing
to the image budget.

**If you have rights to a character**, or commission one, swapping it in is a
single component change — replace the SVG paths in `Guide.tsx`, keep the `Pose`
type, and everything that uses it keeps working.

## Comparison claims

The table on the landing page lists only products whose feature claims were
verified against their own public descriptions in July 2026: Khatabook, OkCredit,
Dukaan AI, and the general handwriting-OCR category (Transkribus, Pen to Print).

Three apps that appeared in a supplied screenshot — KiranaX, Udharbook AI and
AI Khata Books — were **left out** because their claims could not be
independently confirmed. An unverified or fabricated competitor on a public
comparison page is worse than a shorter table.

Every claim is about a *documented feature*, not about quality. All of these are
good products. The stated difference is narrow and factual: none of them start
from a page that has already been written by hand.
