# Audience App

ionic 4 beta app, intended mostly as progressive web app but with option for 
Android/iOS native to give access to (e.g.) notifications on iOS.

See [top-level README](../README.md) for build/dev info

See [audience server README)(../audience-server/README.md) for configuration, to dos

Habanera sample from [youtube](https://www.youtube.com/watch?v=uyGIAYkib6w) 
Dates suggest it should be Victor matrix [B15474](https://adp.library.ucsb.edu/index.php/matrix/detail/700000452/B-15474-Habanera), although that is not the image.

## Notifications

Below relates to in-browser, not full PWA

Vibrate:
- works on Android, but not when screen is locked
- does not work on iPhone

Sound notification:
- works on Android, including for a short time (a few minutes?) after the screen is locked, then it stops
- works on iPhone, but not when screen is locked

