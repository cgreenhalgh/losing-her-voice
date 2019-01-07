# Losing Her Voice use of OSC

## Local server - audience app control

The local server accepts OSC messages on port 9123 (UDP). Note that this is 
unreliable, so best used on local host only.

### `/lhva/state`

set audience app view state

Paramgers:
- STRING - view state name,  i.e. view ID from audience server config, e.g. "act1.scene1" 

Requires:
- performance ID to be set in local server/UI

Forwards view state (with performance ID) to audience server as view state for that performance.

Notes: 
- view state is not persisted across restarts of the audience server.
- if network fails then it is unclear if values will be propagated on restart.

## Remote control of social media

Proposed OSC commands:

### `/lhva/reset`

Reset current performance and playhead

No parameters

Requires:
- performance ID to be set in local server/UI
- local UI as well as local server to be running

### `/lhva/go`

trigger sequence item at playhead & advance playhead

No parameters

Requires:
- performance ID to be set in local server/UI
- local UI as well as local server to be running

Note:
- has no effect if playhead is past end of the sequence items

### `/lhva/playhead/{sequence_item_number}`

set playhead to sequence item with specified "number" (user-specified ID)

No parameters

Requires:
- performance ID to be set in local server/UI
- local UI as well as local server to be running

Note:
- has no effect if sequence item with that number cannot be found.
- if multiple sequence items have the same "number" then the first is used as the new playhead position

### Compare QLab

QLab:
- (has multiple workspaces, and multiple cue lists per workspace, but that probably isn't relevant here)
- each cue has a unique (internally generated) ID (not sure what it looks like)
- each cue has an optional but unique (user allocated) "number"
- each cue has an optional and non-unique title
- the workspace has a current "playhead" which is the next cue to run (may be unset)
- the "normal" action is to "go", i.e. run next cue and advance playhead.
- (has multi-selection which is independent of playhead, but that probably isn't relevant here)

Some QLab supported OSC commands:
- `/workspace/{ID}/go` - run next cue
- `/workspace/{ID}/panic` - fade out and stop, or (twice) hard stop
- `/workspace/{ID}/playhead/{cue_number}` - move playhead to specified cue
- `/workspace/{id}/playhead/next` - move playhead to next cue
- `/workspace/{id}/playhead/previous` - move playhead to next cue
- `/workspace/{id}/reset` - reset workspace

