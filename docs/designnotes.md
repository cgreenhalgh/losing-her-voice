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

## dev notes

- not sure if syphon can be done from within a docker container

try https://github.com/glowbox/ChromeSyphon
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


---

Or try https://github.com/vibber/CefWithSyphon


## data model

- list of items to display in "feed" (v1)
- add/scroll up

Item has:
- title (string)
- user_icon (url)
- content (string) - html??
- image (url, optional)
- date (string)
- likes (number)

