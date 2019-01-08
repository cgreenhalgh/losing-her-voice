# Losing Her Voice surtitles stuff

Tools, etc. for doing surtitles.

See [libretto notes](../docs/libretto.md)

## Build

```
sudo docker build -t surtitles .
```

Run
```
sudo docker run --rm -it --name=surtitles -v `pwd`/data:/root/work/data surtitles
node dist/index.js data/LosingHerVoice_October2018Libretto-for-surtitles.docx data/output
```

See [data/output.txt](data/output.txt) and [data/output.html](data/output.html)

## To do

- [x] handle LHV libretto format
- [x] output show running (HTML) version
- [ ] output glypheo-compatible surtitle file
