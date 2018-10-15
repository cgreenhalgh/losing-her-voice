# Losing Her Voice tech design notes

## architectural overview

The local (in theatre) system consists of:
- QLab, to cue audio recordings and (network) cue other elements and drive projector (warping etc.)
- Isadora, cued by QLab, to do audio processing and video processing and pre-recording video clips (if not done in QLab)
- headless browser with Syphon output, for social media visuals
- Node.js web server to drive headless browser and moderation (browser) interface, for social media visuals
- local database (Redis?), for social media content

The web system (connected to by audience phones) consists of:
- web server serving static web app files
- socket.io-based live state/notification broadcaster (behind reverse proxy)
- ? local database (Redis), to link to socker.io-based broadcaster

## dev notes

- not sure if syphon can be done from within a docker container
