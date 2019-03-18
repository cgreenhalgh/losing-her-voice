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

## To do

- [x] handle LHV libretto format
- [x] output show running (HTML) version
- [x] output glypheo-compatible surtitle file
