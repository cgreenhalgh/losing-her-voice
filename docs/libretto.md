# Libretto notes

## Authored form

The libretto is written in Word. 

- title is first line, centrered, bold, italic
- credit is second line, centered bold
- title of act is centred, bold: "Act One"
- title of scene is centred, bold, part italic: "Scene One: Carmen, the Opera"

- directions are centred

- opening intertitles are prefaced by centred, bold "Intertitles:" followed by sequence of cards
- cards are headed by centered, bold "Card 1" (etc) 
- followed by one or more lines, centred
- later intertitles are not formatted consistently, e.g. act 1 scene 2 "On the screen, an intertitle flashes:" followed by a bold centred line

- singer is identified bold, left e.g. "Lilli", "Press Gentleman 1" (sometimes with parenthetic comment following, e.g. "Lilli (reversed music)")
- directions for singer are in brackets, left, e.g. "(With poignant dignity)", sometimes on their own line and sometimes following lyrics
- words are left, non-bold
- most lines are quite short (5-8 words), others span multiple lines (e.g. 31 words)
- often several lines follow consecutively
- sometimes there are blank lines
- sometimes lines indented (multiple levels)

- in a few places directions are not bracketed and not centred
- one direction is given in angle brackets "<Swoon>"
- one lyric line is bold "I was your diva!"

## Principles

Seems like the surtitles need to:
- be quite short
- sync with the singing
- not include singer
- not include directions or emotes

So probably:
- manually cued by a dedicated individual
- run from a separate program?! 
- controlled from a separate machine?!
- with a dedicated script to include the additional comments

## Internal format

List of items:
- comment
- singer
- surtitle - with "number" and text

Text formatted with simple HTML markup (cf [SubRip/.srt](https://en.wikipedia.org/wiki/SubRip)?!):
- `<b>` - bold
- `<i>` - italic
- `<u>` - underline

## Tools

### Glypheo

[Glypheo](http://glypheo.com/) - free, Mac only. Syphon output.

Internally surtitles seem to have an ID (default numbers from 0, but some suggestion of flexibility e.g. "2.3").
Surtitles form a "track" (e.g. for a language) and exist in a "group".

Surtitles can be disabled, but there is no obvious comment support.

"Glypheo can import a track from an HTML, Word or TXT file.
You can choose to preserve the style, and set a custom separator."
