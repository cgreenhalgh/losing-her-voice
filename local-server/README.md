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
- (timing? optionality?)

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

### To do

- [x] local server protocol version & check
- [x] control UI schedule (order of post type, timing?)
- [x] schedule in external file (reload option)
- [ ] server reset schedule??
- [x] item -> simple item, title -> user_name, add item type
- [x] "announce" item selectively to audience as well as screen/live view (via redis)
- [x] audience app like simple item -> relay through redis -> update server item -> announce item update (live only??)
- [x] add poll item type
- [x] control UI poll open & close -> live view & audience app
- [x] audience app select -> relay through redis -> update server item -> announce item update (live only)
- [x] add quiz variant of poll
- [ ] add re-post item type
- [ ] control UI *make* repost -> live view 
- [ ] audience app re-post -> relay through redis -> update server repost pool -> control UI -> display repost
- [ ] add selfie item type
- [ ] control UI send selfie -> live view
- [ ] audience app create & submit selfie image -> relay through redis -> update server selfie image pool
- [ ] moderation UI view - view server selfie image pool
- [ ] moderate selfie image -> update server selfie image pool
- [ ] audience app share selfie -> relay through redis -> update server selfie post pool -> control UI -> display shared selfie
- [ ] app disconnect warning
- [ ] app smoother reconnect support
