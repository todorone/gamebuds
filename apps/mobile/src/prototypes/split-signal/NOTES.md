# Split Signal prototype

This is a throwaway Stage A learning vehicle for issue #8. It asks whether
three short rounds of private fragments and controlled repair actions create
understandable interdependence, fair participation, voluntary immediate replay,
and unprompted Social Interaction for two to four Players.

## V2 loop

Each round gives every Player one incomplete private fragment of the repair
order. The Play Group has to compare those fragments before each Player repairs
their own signal. A wrong repair spends one of three shared stability charges;
after the third, the current round resets. A Player can ping a teammate by
tapping their card or ping their own signal from the action panel. Every
repaired round pauses on a shared reveal before the Host starts the next one.

After the third reveal, the Host explicitly selects `Play again` or `Stop
testing`. Stopping unlocks `Finish & log out` for every Player. The in-memory
relay records the repair, stability, ping, reveal, replay, and stop events only
for the live Game Session.

Run the mobile app and API, then open the app at one of these URLs:

```text
http://localhost:5173/?host=1&name=Host
http://localhost:5173/?room=ROOMCODE&name=Player
```

The API relay is intentionally in memory and has no auth, D1, persistence, or
production networking guarantees. It exists to put multiple phones through
the mechanic cheaply; the production WebRTC question remains issue #7.

Use `variant=A`, `variant=B`, or `variant=C` to compare the Signal deck,
Systems map, and Social log layouts. The bottom switcher and left/right arrow
keys update the shareable URL.

## Observation capture

For every observed Play Group, record these before deciding whether to absorb
or delete the Prototype:

- time to first unprompted hint, help, targeted ping, reaction, glance, or
  gesture;
- whether every Player repairs a fragment and can name another Player's
  contribution;
- stability spent, round resets, and whether those consequences feel legible
  rather than arbitrary;
- moderator interventions, silent button scanning, or any Player becoming a
  spectator;
- the reaction to each shared reveal and whether the Play Group chooses
  `Play again` without encouragement;
- the final `Play again` / `Stop testing` choice and the reason the Play Group
  gives in their own words.

## Decision record

No real Play Group observations are recorded in this repository yet, so the
design decision remains pending. Advance Split Signal only if the first round
is understandable without moderator help and at least three observed Play
Groups show two or more kinds of unprompted Social Interaction within two
minutes, fair participation, and voluntary immediate replay. Record a failure
and move to Common Pulse if Players repeatedly solve by silent button scanning,
one Player coordinates every repair, stability feels punitive rather than
meaningful, or the replay decision needs prompting.

The completed-session affordance is `Finish & log out`: it removes the Player
from the disposable relay and returns that device to the landing screen. A
Player cannot leave through this control until the repair chain is complete, so
the prototype still preserves the cooperative dependency during play.

Decision: pending observed Play Groups.
