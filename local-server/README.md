# Losing Her Voice Local Server

## Build / dev

See [../README.md](../README.md)

## See also

- [OSC usage](../docs/osc.md) - support for OSC
- [internal protocol notes](../docs/protocol.md) - notes on internal communication

## Configuration

Local (social media) UIs configuration file, [data/local-config.json](data/local-config.json).

Object with:
- `metadata`, see below
- `performances`, array of Performance items, see below
- `scheduleItems`, array of Schedule Items, see below
- `selfies`, array of Selfie Items that can be used as selfie items 
- `reposters`, array of Reposters (see below) who can be used to make Reposts

Metadata, config file metadata; object with:
- `title` (string) - configuration title
- `description` (string, optional) - description
- `author` (string, optional) - creator of configuration
- `version` (string) - version identifier for configuration file (advisory only)
- `fileVersion`, currently 'lhv/local/v3'

Performance, is object with:
- `id` (string) unique
- `title` (string)
- `isPublic` (boolean, default false) whether performance is public/"real" (vs rehearsal/test)
- `startDatetime` (string) earliest start date/time in RFC3339 format (e.g. "2018-04-06T18:00:00Z")
- `durationSeconds` (number, default unlimited) maximum duration (after start date/time) in seconds
- `timezone` (string, optional) timezone in which performance takes place (for local time display)

Schedule Item is object with:
- `itemType` (string, optional), as per Item: 'simple', 'repost', 'quiz', 'poll', 'selfie', 'blank', 'reset'
- `title` (string) schedule item title
- `description` (string) schedule item description
- `item` (social media Item), where a specific instance is provided, i.e. simple, quiz or poll
- `closePolls` (boolean, optional), close any open quiz/poll
- `videoState` (VideoState,optional), set video/selfie playback state
- (timing? optionality?)

VideoState has:
- `url` (string, optional) - video to start
- `loop` (boolean, default false), whether to look current video
- `queue` (boolean, default false), whether to wait until current video ends to start new one
- `mode` (VideoMode, optional) - `hide`, `fullscreen`, `selfies`

Item has:
- `id` (string)
- `itemType` (string) - 'simple', 'repost', 'quiz', 'poll', 'selfie', 'blank', 'reset'
- `user_name` (string)
- `user_icon` (url)
- `toAudience` (boolean)

Simple item has (extends Item):
- `content` (string) - html??
- `image` (url, optional), probably relative to static/ but may need converting to data urls for audience app??
- `likes` (number, default 0)
- `canLike` (boolean, default false)
- `canShare` (boolean, default false)

Selfie item has (extends Item):
- (?? `content` (string) - html??)
- `image` (string) 
(note, the selfie items sent from the audience app are a bit different, e.g. with moderation info)

Quiz(/Poll) item has (extends Item):
- `content` (string) - html??
- (?? `image` (url, optional))
- `options` (list of Option)
- `updateLive` (boolean, default false) - show votes live
- `openPrompt` (string, optional) - html? shown when open
- `closedPrompt` (string, optional) - html? shown when closed

Quiz/Poll Option item:
- `content` (string) - html?
- (?? `image` (url, optional))
- `correct` (boolean, quiz item option only)

Reposter is object with:
- `user_name` (string)
- `user_icon` (url)

## Data

Server needs to maintain:
- configuration
- posted items
- audience selfie images (for moderation)
- audience reposts
- video state

### Items

Need to persist including server-allocated IDs, e.g. to allow reposting after reboot

### Selfie images

(implemented)

Stored in local redis, under keys `image:v1:HASH` where `HASH` is hex sha256 hash of image.
(todo) -> `image:v2:PERFORMANCE:HASH`

Content is JSON-encoded SelfieImage (from socialtypes.ts).
(todo) -> SelfieImage will also include performanceid

### Audience reposts

(not implemented)

Need to count number of shares by each user_name to push new names to the top. `lhva:reposts:v1:PERFORMANCEID:NAME` = number

Need to post each repost once (only). `lhva:share:v1:PERFORMANCEID:PADNPOSTS:DATETIME:INDEX` = ShareItem (id, user_name)
(Note, ordered by increasing NPosts, then datetime; index for uniqueness)

Note: note very useful without persistent items (above)

### To do

Social media support:

- [x] item -> simple item, title -> user_name, add item type
- [x] "announce" item selectively to audience as well as screen/live view (via redis)
- [x] audience app like simple item -> relay through redis -> update server item -> announce item update (live only??)
- [x] add poll item type
- [x] control UI poll open & close -> live view & audience app
- [x] audience app select -> relay through redis -> update server item -> announce item update (live only)
- [x] add quiz variant of poll
- [x] add re-post item type
- [x] control UI *make* repost -> live view 
- [x] add selfie item type
- [x] control UI show/hide video -> live view
- [x] control UI send selfie -> live view
- [x] audience app create & submit selfie image -> relay through redis -> update server selfie image pool
- [x] moderation UI view - view server selfie image pool
- [x] moderate selfie image -> update server selfie image pool
- [x] audience app re-post -> relay through redis -> update server repost pool -> control UI -> display repost
- [x] selfie live view mark 2 support = export to specific files in configured directory, selfies linked to performance on submission, copy only after performance set/started
- [x] blank item support
- [x] avoid spurious warnings in spreadsheet processor
- [x] scheduled item that will clear the posts from the main screen

- [ ] scroll posts down not up
- [ ] CSS/images/fonts for styling - sans (helvetica?) font, small post separator, no border
- [ ] size/scale for live view 768x768 (SR) / 728x1024 (SL) minus borders

Local server/control:

- [x] local server protocol version & check
- [x] control UI schedule (order of post type, timing?)
- [x] schedule in external file (reload option)
- [x] server reset schedule
- [x] persist selfie images on audience server for local server offline
- [x] control UI cleaner (table) view
- [x] control UI schedule simple control (default/next)
- [x] schedule remote control? (OSC?)

- [ ] fix redis subscription failure handling for feedback, e.g. (feedback not subsequently received; unclear if other direction still working but no corresponding error - subscription?)
```
ERROR redis error Error: Redis connection to music-mrl.nott.ac.uk:6379 failed -
read ECONNRESET { Error: Redis connection to music-mrl.nott.ac.uk:6379 failed -
read ECONNRESET
    at TCP.onread (net.js:622:25) errno: 'ECONNRESET', code: 'ECONNRESET', syscall: 'read' }
error getting feedback from lhva:feedback:v5: Redis connection lost and command aborted. It might have been processed.
```
- [ ] applescipt to open and resize CEF?!
- [ ] persist items & performance across server restart?!
- [ ] send OSC?
- [ ] prune items in live view? (performance)

Audience app:

- [x] move app config to external (watched) file - note watch didn't work; reload with redis RELOAD message
- [x] synced audio play/stop (act 2 scene 5c)
- [x] volume option for synced audio play/stop 
- [x] audioDelay option for synced audio play/stop 
- [x] check/fix blocked autoplay/failed initial play policy enforcement
- [x] "show about to begin" audio? (should not be triggered by app (re)load when view current, only by initial triggering of view)
- [x] link to Qlab (via local server & OSC)
- [x] initial page to prompt click on app
- [x] reconnect if disconnected
- [x] make full screen
- [x] profile - set/choose name
- [x] take selfie photo 
- [x] social media post display (from server)
- [x] social media likes (to server -> local server)
- [x] social media quiz (to server -> local server)
- [x] move audience server to https for media access
- [x] (deliberately) unsynced audio option
- [x] app reset option to clear name/selfie
- [x] check/edit name from social media view
- [x] separate testing and each performance (i.e. unique client URL, etc.)
- [x] social media re-share? (to server -> local server)
- [x] audience app share selfie -> relay through redis -> update server selfie post pool -> control UI -> display shared selfie
- [x] social media share selfie (to server -> local server) (= "publish" ?!)
- [x] better selfie-taking instructions
- [x] blank(ish) view (e.g. fading out) (act2.scene4d)
- [x] flickering images (act2.scene5f)
- [x] iphone troubleshoot/fix audio non-playing (https??)
- [x] support for image(s) in view pages
- [x] disable HTTP access and/or replace with redirect
- [x] check/fix like/share button can be pressed multiple times
- [x] move fullscreen off whole title
- [x] fix (implement) postSelfie flag to enable publish selfie action
- [x] trap/handle back navigation (real html5 nav underneath??)
- [x] fix clear user data to clear name selection controls
- [x] slide-out menu
- [x] fix/support add to desktop with performance id, e.g. persist and default to performance id in local storage?
- [x] clarify wording for mute/unmute (i.e. media volume, not ring or alarm)
- [x] support link from app page to external questionnaire
- [x] visual alert for "turn sound on" ?!
- [x] iphone selfie image rotation fix - maybe EXIF tag? see [this](https://stackoverflow.com/questions/20600800/js-client-side-exif-orientation-rotate-and-mirror-jpeg-images)
- [x] show last social item on reload
- [x] control over option to share/like (no by default)
- [x] CSS/images/fonts for styling
- [x] background images/scrapbook styling?!
- [x] option for releasing new menu items in the interval
- [x] post/quiz view in menu mode
- [x] menu mode notification/popup for post/quiz
- [x] notification/alert facility, e.g. from scene change

- [ ] option to fade images in scene info view
- [ ] submit selfie image over http rather than socket.io (for use well in advance)
- [ ] specific user guidance for in-browser vs PWA/home screen?
- [ ] disable communication before and after event ?! (or otherwise limit traffic)
- [ ] * log usage
- [ ] * troubleshoot/fix audio playback (problems on some devices...) (not just click vs touch!) ...
- [ ] research subject ID allocate and view?
- [ ] add ServiceWorker support?!
- [ ] app disconnect warning?
- [ ] app smoother reconnect support?
- [ ] reduce title font size on iphone se and smaller ?! (spacing between characters is greater on iphone!) may font-kerning: normal; letter-spacing: normal; text-rendering: optimizeLegibility; font-feature-settings: "kern"; -webkit-font-feature-settings: "kern"; -moz-font-feature-settings: "kern"; -moz-font-feature-settings: "kern=1";?
- [ ] trouble-shoot failure to persist performance id on iphone
- [ ] cover page sizing problem? (often slightly too wide?)

probably not...
- [ ] ? selfie post with hash not image?
- [ ] ? show selfie on phone support?
- [ ] ? card navigation within view/page
- [ ] ? card navigation animation, e.g. newspaper, social media, scrap book
- [ ] ? personal scrapbook - souvenir audio
- [ ] ? personal scrapbook - selfie
- [ ] ? personal scrapbook - social media??

Subtitles:

- [x] agree strategy & technology - on screen? from qlab??
- [x] tool to convert libretto document to cues

Content

- [x] initial profile names
- [x] initial menu items
- [x] name options for profile

- [ ] menu items and associated content
- [ ] views and associated cards/content - for every scene
- [ ] posts (text and images)
- [ ] quizes
- [ ] polls
- [ ] selfie images
- [ ] reposter names
- [ ] libretto formatted for subtitles
- [ ] questionnaire

To don't:
- [x] don't add Geraldine to selfie
- [x] no need to sync libretto changes to cues
