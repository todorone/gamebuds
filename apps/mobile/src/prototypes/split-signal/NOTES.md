# Split Signal prototype

This is a throwaway Stage A learning vehicle for issue #8. It asks whether
private fragments plus one controlled repair action create understandable
interdependence, fair participation, voluntary immediate replay, and
unprompted Social Interaction for two to four Players.

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

Record these after real Play Group sessions before deciding whether to absorb
or delete the prototype:

- time to first unprompted hint, help, ping, reaction, glance, or gesture;
- whether every Player repairs one fragment and understands another Player's
  contribution;
- moderator interventions and any Player who becomes a spectator;
- first-round completion and whether the group chooses another round without
  encouragement;
- failure modes, especially silent button scanning, coordinator dominance,
  and a flat or confusing ending.

The completed-session affordance is `Finish & log out`: it removes the Player
from the disposable relay and returns that device to the landing screen. A
Player cannot leave through this control until the repair chain is complete, so
the prototype still preserves the cooperative dependency during play.

Decision: pending observed Play Groups.
