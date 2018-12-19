# Losing Her Voice protocol(s)

## Audience app

See [audience-server/README.md](../audience-server/README.md) for configuration format.

See [audience-server/src/types.ts](../audience-server/src/types) for details of types and messages.

### Interaction

Client Start-up:
- on start-up, app sends 'lhva.client.hello' (MSC_CLIENT_HELLO) to server (including performance ID obtained from URL)
- if the client is incompatible with the server then it sends MSG_OUT_OF_DATE = 'lhva.server.outofdate' and there is no further interaction
- in reply to client hello, server sends 'lhva.server.configuration' (MSG_CONFIGURATION) back to client, which includes static app configuration (e.g. menu items and page content) (this is suppressed if the client already has the same version configuration from a previous interaction)
- in reply to client hello the server also sends 'lhva.server.state' (MSG_CURRENT_STATE) with the current app view state (e.g. forced view, after performance)
- after first message from server, client sends MSG_CLIENT_PING = 'lhva.client.ping' in order to get a better timing offset estimate

Ongoing operation:
- whenever the app state is changed (via a redis even on channel 'lhva.state') the server sends MSG_CLIENT_PING = 'lhva.client.ping' to all connected apps

Recovery:
- if the client disconnects and re-connects it repeats as per client start-up, but the hello message indicates that it already has (some version of) the configuration.

## Audience server

### Redis subscription(s)

#### Audience app view

Server subscribes to channel 'lhva.state'. 
Message is a JSON object with properties:
- `state` (string) - state, see below
- `performanceid` (string) performance ID

Following custom values are specified:
- 'RELOAD' - server reloads configuration file to send to subsequent apps
- 'RESET' - set state for all apps to pre-performance (i.e. menu and not post-performance)
- 'INTERVAL' - set state for all apps to interval (i.e. menu and not post-performance, defaulting to specific menu item)
- 'POST' - set state for all apps to post-performance (i.e. menu including post-performance options, defaulting to specific menu item)
- any other string - set state for all apps to force view the view with that id (views and their IDs are in the audience-server configuration file)
e.g.
- 'act1.prelude', 'act1.scene1', ...

## Local app (social media)

### V0.1 (2018-12-06)

See [local-server/src/types.ts](../local-server/src/types) for details of types and messages.

See [designnotes.md](designnotes.md) for all social media types (design/plan).

See [local-server/README.md](../local-server/README.md) for configuration format.

Note: the same app is used for the control view and for the live view.

Client start-up:
- on start-up the app sends MSG_CLIENT_HELLO = 'lhr.client.hello' to the server
- the server replies with MSG_CONFIGURATION = 'lhr.configuration' and the current configuration (including possible performance IDs)
- if performance is set the server also replies with MSG_ANNOUNCE_PERFORMANCE = 'lhr.announce.performance' and the current performance ID (if set)
- if performance is set the server also replies with MSG_ANNOUNCE_CONTROL_ITEMS = 'lhr.announce.controlItems' and the list of (current) ControlItems in the server (i.e. options for the management UI)
if performance is set the server also replies with MSG_ANNOUNCE_ITEMS = 'lhr.announce.items' and the history of items posted (on the main view)

Management UI post:
- control UI sends MSG_START_PERFORMANCE = 'lhr.start.performance'
- control UI sends MSG_POST_ITEM = 'lhr.post.item' to server with selected ControlItem
- server updates items (and ControlItem) and sends MSG_ANNOUNCE_ITEM = 'lhr.announce.item' to all clients
- client updates (live) UI with newly posted item

### Messages from local to audience server

- announce simple item
- announce poll (open, closed)
- announce quiz (open, closed)
- (not repost?)
- (not selfie?)

Use redis channel 'lhva.announce.v1'.
Send JSON-encoded object with:
- `performanceid` (string) performance ID
- `item` (Item) (subtype).

### Messages from audience server to local server

- like simple item
- repost simple item
- response to poll/quiz
- submit selfie image
- share selfie

(each includes performance ID)
