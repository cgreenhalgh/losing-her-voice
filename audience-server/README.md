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
- `nameParts`, array of NamePart, see below
- `fileVersion`, currently "lhv/audience/v3"

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
- `audioJitterSeconds` (number, optional, default 0) - additional random delay added to `audioDelaySeconds`
- `audioVolume` (number, optional, default 1) - volume of audio
- `showItems` (boolean, default false) - show social media
- `postSelfie` (boolean, default false) - show option to post/publish selfie
- `dark` (boolean, default false) - dark/blank(ish) view
- `flicker` (FlickerConfig, optional) - flickering image settings, see below

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

## To do

See local-server [README](../local-server/README.md)

