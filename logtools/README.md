# Log tools

## audience app logs

see [audience server README](../audience-server/README.md) for log format information.

Essentially JSON object per line, with standard fields time, msg (name/text) & level (trace 0, debug 10, ...)

```
docker build -t logtools .
docker run -it --rm -v `pwd`/data:/root/work/data -v `pwd`/src:/root/work/src logtools
```

Client actions -> `client.hello`, `client.disconnect` (socket.io), `client.log` messages (http)

`client.log` has clientId, runId, performanceId, events, clientVersion (18)

`event` has time, msg, n? (sequence id), info (opt)

```
tsc
node dist/clients.js data/local-config.json \
  data/20190331T204912101Z.log \
  data/20190402T135622633Z.log \
  data/20190404T162124104Z.log \
  data/20190405T194340515Z.log \
  data/20190406T200402389Z.log > data/output.txt
```

```
performance show1, 89 clients
takeselfies: 36, consent2 37

performance show2, 89 clients
takeselfies: 30, consent2 36
```
Why is consent2 bigger? lost log messages? Selfie taken in old version?? different show???

## devices

App info was passed on to marketing 2nd April.

- cmg, show 2 'Clifford'?
- cmg, show 1, 'Abraham'? no, must have changed it

Firebase link info is wrapped up by month now, show1 165 clicks/158 redirects; show 2 116 clicks/redirects 

Pages
- about
- cast
- help
- introduction
- posts *
- synopsis
- thanks