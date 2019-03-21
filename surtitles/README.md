# Losing Her Voice surtitles stuff

Tools, etc. for doing surtitles.

See [libretto notes](../docs/libretto.md)

## Build

```
sudo docker build --network=internal -t surtitles .
```

Run
```
sudo docker run --rm -it --name=surtitles --network=internal -v `pwd`/data:/root/work/data surtitles
node dist/index.js data/LosingHerVoice_October2018Libretto-for-surtitles.docx data/output
```

See [data/output.txt](data/output.txt) and [data/output.html](data/output.html)

Note, can read output.txt into Glypheo - enter single newline as user-defined separator. 
Character encoding (UTF-8) seems to be OK (e.g. elipsis, apostrophes).

## App support

Convert word doc with works to JSON HTML for use in audience app, e.g.
```
node dist/doc2app.js data/Audience-app-text.docx data/app-text.json
```

This little program reads a Word document and outputs JSON-encoded lines
of HTML suitable for pasting into the audience-config.json file.
It:
- Converts Heading1 to (HTML) h1 (will show in the CATChild font)
- Converts Heading2 to h2 (ditto)
- Converts Normal para to p
- Should support bold & italic (but not different font sizes or styles)
- On empty paragraph, starts a new output section (which on a page will insert a divider)
- Should support centred Normal paragraphs
- Convert '[[' -> '<' and ']]' -> '>' to allow HTML element insertion (e.g. images '[[img src="..." class="view_medium"]]')

So preferred usage is:
- Put empty paragraphs before and after and every Page X: … titles (so they don’t get included in the page text)
- Feel free to use Heading 1 and Heading 2 within page content
- Check that (apart from around the page headings) you have empty lines where you’d like dividers to appear

## To do

- [x] handle LHV libretto format
- [x] output show running (HTML) version
- [x] output glypheo-compatible surtitle file
