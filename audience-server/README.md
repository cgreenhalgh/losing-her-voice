# Audience Server

For losing her voice.

Node.js, at least for for now.

## Build / dev

See [../README.md](../README.md)

## File format

Audience app configuration file, [data/audience-config.json](data/audience-config.json).
Object with:
- `metadata`, see below
- `menuItems`, array of Menu Items, see below
- `views`, array of Views, see below

Metadata, config file metadata; object with:
- `title` (string) - configuration title
- `description` (string, optional) - description
- `author` (string, optional) - creator of configuration
- `version` (string) - version identifier for configuration file (advisory only)

Menu Item, i.e. entry in normal navigational menu such as "About Geraldine"; object with:
- `id` (string) - unique internal ID, referred to from View `defaultMenuId`
- `title` (string) - menu item text and page title
- `postPerformance` (boolean, default false) - item is only visible after performance
- `cards`, array of Cards, see below

Card, i.e. page of content in a Menu Item or View, object with:
- `html` (string) - HTML-marked up page content. For now use standard tags: H1, H2, P

View, i.e. app state/view associated with a particular part (e.g. scene) of the peformance; object with:
- `id` (string) - unique internal ID, referred to from QLab cues, e.g. 'act1.scene1'
- `cards`, array of Cards with view content (see above)
- `act` (nubmer) - act number (1 or 2), used as clue for CSS styling (in future)
- `defaultMenuId` (string, optional) - if act ends with this view showing, which menu item should be the default (e.g. questionnaire after act 2 or take selfie after act 1)
- `audioFile` (string, optional) - name of file (in `src/assets`) to play during view
- `audioDelaySeconds` (number, optional, default 0) - delay to start of audio (`audioFile`) compared to start of view
- `audioVolume` (number, optional, default 1) - volume of audio

## To do

Technical

- [x] move app config to external (watched) file - note watch didn't work; reload with redis RELOAD message
- [x] synced audio play/stop (act 2 scene 5c)
- [x] volume option for synced audio play/stop 
- [x] audioDelay option for synced audio play/stop 
- [x] check/fix blocked autoplay/failed initial play policy enforcement
- [x] "show about to begin" audio? (should not be triggered by app (re)load when view current, only by initial triggering of view)
- [x] link to Qlab (via local server & OSC)
- [ ] support link from app page to external questionnaire
- [ ] card navigation within view/page
- [ ] card navigation animation, e.g. newspaper, social media, scrap book
- [ ] blank(ish) view (e.g. fading out) (act 2 scene 5a)
- [ ] unsynced audio & flickering images (act 2 scene 5b)
- [ ] profile - set/choose name
- [ ] take selfie photo 
- [ ] add Geraldine to selfie
- [ ] social media post display (from server)
- [ ] social media likes (to server -> local server)
- [ ] social media quiz (to server -> local server)
- [ ] social media share selfie (to server -> local server) (= "publish" ?!)
- [ ] social media re-share? (to server -> local server)
- [ ] social media 
- [ ] personal scrapbook - souvenir audio
- [ ] personal scrapbook - selfie
- [ ] personal scrapbook - social media??
- [ ] moderation...

Content

- [ ] menu items and associated content
- [ ] views and associated cards/content
- [ ] social media activities/etc
- [ ] CSS/images for newspaper, social media, scrapbook (or whatever)
- [ ] name options for profile
- [ ] image options for profile?
