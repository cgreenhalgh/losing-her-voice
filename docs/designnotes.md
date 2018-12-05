# Losing Her Voice tech design notes

## architectural overview

The local (in theatre) system consists of:
- QLab, to cue audio recordings and (network) cue other elements and drive projector (warping etc.)
- Isadora, cued by QLab, to do audio processing and video processing and pre-recording video clips (if not done in QLab)
- headless browser with Syphon output, for social media visuals - shows [local-ui](../local-ui)
- Node.js web server to drive headless browser and moderation (browser) interface, for social media visuals = [local-server](../local-server)
- local database (Redis?), for social media content
- control view in browser
- moderation view in browser (local or remote?)

The web system (connected to by audience phones) consists of:
- web server serving static web app files
- socket.io-based live state/notification broadcaster (behind reverse proxy)
- ? local database (Redis), to link to socker.io-based broadcaster

## socket.io comms

Socket.io handshakes with HTTP then switches to websockets.

Socket io connection reports disconnect after being in background/phone off for a while (10+ seconds with no messages).

Sending a new message (to the old connection) provokes (after a few seconds) a new connection. But this has a different connection (socket.id) ID and client doesn't send hello so it doesn't get sent new messages.

Viewing the app/browser provokes a new connection with about 1 second.

=> client should emit hello on connect
=> client should monitor for disconnect and (a) attempt to re-connect (b) switch to loading/error state until reconnected

## dev notes

## Syphon

- not sure if syphon can be done from within a docker container

### CefWithSyphon

Was https://github.com/vibber/CefWithSyphon
newer, pre-built version
https://github.com/marciot/CefWithSyphon
https://github.com/marciot/CefWithSyphon/releases

Note: works, but size is of cefclient window, not configurable.
Defaults to 1600x1200 image with scale factor 2.

Note: only sends a frame when view updates

simple syphon test programs
https://github.com/Syphon/Simple/releases/tag/version-3

### ChromeSyphon

version with config file...

try https://github.com/glowbox/ChromeSyphon
https://github.com/glowbox/ChromeSyphon/releases

reads config.json
- url
- content-width
- content-height
- start-minimized
- allow-window-resize
- syphon-name

Pre-built doesn't work with my app - just shows white screen. 
Seems to be a relatively old browser version.

### rebuild??

hopefully not needed!

```
git clone https://github.com/glowbox/ChromeSyphon.git
cd ChromeSyphon
```

That used a pre-built release of CEF no longer available.

Build CEF? https://bitbucket.org/chromiumembedded/cef/wiki/BranchesAndBuilding
July 2018 release 3497
downloads from http://opensource.spotify.com/cefbuilds/index.html
try macos standard distribution
cef_binary_3.3497.1840.gcd24143_macosx64.tar.bz2

extract into CEF/

Open the xcode project and build it.

Fails: 

Showing Recent Issues
Error: There is no SDK with the name or path '/Users/cmg/workspace/losing-her-voice/ChromeSyphon/macosx10.11'

CEF says XCode 9.3 - i have 8. something and latest is 10.something

## data model

### social media items

For big screen (local-)

- list of items to display in "feed" (v1)
- add/scroll up

Item has:
- title (string)
- user_icon (url)
- content (string) - html??
- image (url, optional)
- date (string)
- likes (number)

