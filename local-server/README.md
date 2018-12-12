# Losing Her Voice Local Server

## Build / dev

See [../README.md](../README.md)

## Configuration

TODO:
Local (social media) UIs configuration file, [data/local-config.json](data/local-config.json).

Object with:
- `metadata`, see below
- `scheduleItems`, array of Schedule Items, see below
- `selfies`, array of Selfie Items that can be used as selfie items 
- `reposters`, array of Reposters (see below) who can be used to make Reposts

Metadata, config file metadata; object with:
- `title` (string) - configuration title
- `description` (string, optional) - description
- `author` (string, optional) - creator of configuration
- `version` (string) - version identifier for configuration file (advisory only)
- `fileVersion`, currently 'lhv/local/v1'

Schedule Item is object with:
- `itemType` (string, optional), as per Item: 'simple', 'repost', 'quiz', 'poll', 'selfie'
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
- `itemType` (string) - 'simple', 'repost', 'quiz', 'poll', 'selfie'
- `user_name` (string)
- `user_icon` (url)
- `toAudience` (boolean)

Simple item has (extends Item):
- `content` (string) - html??
- `image` (url, optional), probably relative to static/ but may need converting to data urls for audience app??
- `likes` (number, default 0)

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

- [ ] audience app re-post -> relay through redis -> update server repost pool -> control UI -> display repost
- [ ] selfie live view mark 2 (TBD - export to isadora? fly around animations? ...?)
- [ ] CSS/images for styling

Local server/control:

- [x] local server protocol version & check
- [x] control UI schedule (order of post type, timing?)
- [x] schedule in external file (reload option)

- [ ] server reset schedule??
- [ ] persist selfie images on audience server for local server offline
- [ ] control UI cleaner (table) view
- [ ] control UI schedule simple control (default/next)
- [ ] send OSC?
- [ ] schedule remote control? (OSC?)
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

- [ ] submit selfie image over http rather than socket.io (for use well in advance)
- [ ] app reset option to clear name/selfie
- [ ] audience app share selfie -> relay through redis -> update server selfie post pool -> control UI -> display shared selfie
- [ ] app disconnect warning
- [ ] app smoother reconnect support
- [ ] (deliberately) unsynced audio option
- [ ] specific user guidance for in-browser vs PWA/home screen
- [ ] disable communication after event ?! (or otherwise limit traffic)
- [ ] support link from app page to external questionnaire
- [ ] card navigation within view/page
- [ ] card navigation animation, e.g. newspaper, social media, scrap book
- [ ] blank(ish) view (e.g. fading out) (act 2 scene 5a)
- [ ] flickering images (act 2 scene 5b)
- [ ] social media share selfie (to server -> local server) (= "publish" ?!)
- [ ] social media re-share? (to server -> local server)
- [ ] check/edit name from social media view
- [ ] personal scrapbook - souvenir audio
- [ ] personal scrapbook - selfie
- [ ] personal scrapbook - social media??
- [ ] separate testing and each performance (i.e. unique client URL, etc.)
- [ ] iphone selfie image rotation fix - maybe EXIF tag? see [this](https://stackoverflow.com/questions/20600800/js-client-side-exif-orientation-rotate-and-mirror-jpeg-images)
- [ ] iphone troubleshoot/fix audio non-playing (https??)
- [ ] better selfie-taking instructions
- [ ] CSS/images for styling

Subtitles:

- [ ] agree strategy & technology - on screen? from qlab??
- [ ] tool to convert libretto document to cues
- [ ] tool to sync libretto changes to cues

Content

- [x] initial profile names
- [x] initial menu items

- [ ] menu items and associated content
- [ ] views and associated cards/content - for every scene
- [ ] name options for profile
- [ ] posts (text and images)
- [ ] quizes
- [ ] polls
- [ ] selfie images
- [ ] reposter names
- [ ] libretto formatted for subtitles

To don't:
- don't add Geraldine to selfie
