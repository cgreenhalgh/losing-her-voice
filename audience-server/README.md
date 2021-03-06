# Audience Server

For losing her voice.

Node.js, at least for for now.

## Build / dev

See [../README.md](../README.md)

## File format

Audience app configuration file, [../audience-app/src/assets/audience-config.json](../audience-app/src/assets/audience-config.json).
Object with:
- `metadata`, see below
- `options`, see below
- `menuItems`, array of Menu Items, see below
- `views`, array of Views, see below
- `nameParts`, array of NamePart, see below
- `fileVersion`, currently "lhv/audience/v3"

Metadata, config file metadata; object with:
- `title` (string) - configuration title
- `description` (string, optional) - description
- `author` (string, optional) - creator of configuration
- `version` (string) - version identifier for configuration file (advisory only)

Options, general UI options, object with:
- `notifyVibrate` (boolean, default false) attempt to vibrate on new post
- `notifyPopup` (boolean, default false) attempt to show pop-up on new post
- `notifySound` (boolean, default false) attempt to play notification sound on new post
- `noSoundInShow` (boolean, default false) disable notification sound in show (even if enabled in pre/post)
- `notifyView` (boolean, default false) attempt to vibrate on new view
 
Menu Item, i.e. entry in normal navigational menu such as "About Geraldine"; object with:
- `id` (string) - unique internal ID, referred to from View `defaultMenuId`
- `title` (string) - menu item text and page title
- `postPerformance` (boolean, default false) - item is only visible after performance
- `prePerformance` (boolean, default false) - item is only visible before performance
- `inPerformance` (boolean, default false) - item is only visible during the interval
- `cards`, array of Cards, see below

Card, i.e. page of content in a Menu Item or View, object with:
- `html` (string) - HTML-marked up page content. See notes below on markup.

View, i.e. app state/view associated with a particular part (e.g. scene) of the peformance; object with:
- `id` (string) - unique internal ID, referred to from QLab cues, e.g. 'act1.scene1'
- `cards`, array of Cards with view content (see above)
- `act` (nubmer) - act number (1 or 2), used as clue for CSS styling (in future)
- `defaultMenuId` (string, optional) - if act ends with this view showing, which menu item should be the default (e.g. questionnaire after act 2 or take selfie after act 1)
- `audioFile` (string, optional) - name of file (in `src/assets`) to play during view
- `audioDelaySeconds` (number, optional, default 0) - delay to start of audio (`audioFile`) compared to start of view
- `audioJitterSeconds` (number, optional, default 0) - additional random delay added to `audioDelaySeconds`
- `audioVolume` (number, optional, default 1) - volume of audio
- `showItems` (boolean, default false) - show social media
- `postSelfie` (boolean, default false) - show option to post/publish selfie
- `dark` (boolean, default false) - dark/blank(ish) view
- `flicker` (FlickerConfig, optional) - flickering image settings, see below
- `notify` (boolean, default options.notifyView) attempt to vibrate on switch to view

NamePart, object with:
- `title` (string)
- `required` (boolean, default false)
- `options` (array of string)

FlickerConfig, object with:
- `images` (array of URLs), images to show
- `minFraction` (number, default 0) min fraction of image to show
- `maxFraction` (number, default 1) max fraction of image to show
- `minShowSeconds` (number, default 0) min visible time (seconds)
- `maxShowSeconds` (number, default 1) max visible time (seconds)
- `minBlankSeconds` (number, default 0) min blank time (seconds)
- `maxBlankSeconds` (number, default 1) max blank time (seconds)

Performance, object with:
- `id` (string
- `title` (string
- `startDatetime` (string) RFC3339 GMT
- `durationSeconds` (number)

Also a performance file per performance in ../audience-app/src/assets/nocache/PERFID.json

Performance file, object with
- `performance` - Performance info (above)
- `finished` (boolean, default false)

### HTML Markup

In html content (i.e. in cards), for now use standard tags: H1, H2, P. 

h1 and h2 and formatted in the CATChild font.

Style "centerText" should center-align text.

For an image on its own typically this will be a relative path "assets/...".
Style with CSS class "view_large" (100% width), "view_medium" (66% width) or "view_small" (33% width).

## Logs

Writes logs to logs/YYYYMMDDTHHMMSSZ.log

Set environment variable DEBUG to 1/true to write debug to file.
Error is also written to console.

Using [bunyan](https://www.npmjs.com/package/bunyan).

This adds standard log fields to JSON log object: 
- v (log version),
- level (0=trace, 10=debug, warn, info, error, fatal)
- name
- hostname, pid
- time (ISO)
- msg

Pretty print w bunyan command (./node_modules/.bin/bunyan).

We log various user-readable messages, plus more structured key events:
- log.start - application/log start
- announce.item - {performanceid,item}
- announce.state - {performanceid, state, currentState}
- client.hello - {clientHello}
- client.disconnect - {clientInfo}
- feedback.relay - {feedback,method}
- client.log - {clientId, runId, performanceId, events} - event, see below

client log events, all with
- time (ISO),
- msg, 
- info, optionally - fields listed after individual event msg

Events (msg) {info fields}:
- path {path} - app path change
- item {id,itemType} - item change
- view {id,showItems} - forced view change 
- noview
- name {user_name} - name change
- load
- visible - web page
- hidden - web page
- taptostart
- takeselfie - choose file
- consent1 - selfie
- consent2 - selfie
- link {url} - clicked on
- like {id}
- share {id,user_name}
- choose.select {id,option} - touch
- choose {id,option} - send
- shareselfie
- clearuserdata
- showmenu
- hidemenu
- tapplay
- play {src,currentTime}
- playfailed
- playnotification - sound
- pause
- vibrate - successfullly
- popup - notification

todo:
- beforeleave ??

## To do

See local-server [README](../local-server/README.md)

