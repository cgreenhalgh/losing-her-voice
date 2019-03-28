# Losing Her Voice Tech

Tech for the opera Losing Her Voice, by Elizabeth Kelly.

Copyright (c) 2018, The University of Nottingham

Status: just starting...

Overview:
- local-server - runs on in-theatre laptop, alongside qlab, serves local-app; also forwards OSC to audience-server 
- local-app - browser UI (angular) to manage social media/etc and generate projection view (via CEF/Syphon)
- audience-server - runs on externally accessible server, serves audience-app; receives updates via redis
- audience-app - webapp (angular) for audience; configured via audience-config.json file from audience-server

## See also

- [local-server README](local-server/README.md) - configuration for social media items
- [audience-server README](audience-server/README.md) - configuration for audience app (e.g. information to show in app other than social media items)
- [OSC usage](docs/osc.md) - support for OSC
- [internal protocol notes](docs/protocol.md) - notes on internal communication

## Build dev

if using Vagrant
```
vagrant up
vagrant ssh
```

Note: consider DNS fix for vagrant: DNS can be more reliable if, once after first creating VM, you shut down VM (vagrant halt) and
```
vboxmanage list vms
vboxmanage modifyvm "losing-her-voice_default_XXXX" --natdnshostresolver1 on
vagrant up
```

### one-time docker set-up

```
sudo docker network create --driver bridge internal
```

### redis container

Default for now - should secure.

```
LC_CTYPE=C < /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-32} > redis.password
sed -e "s/PASSWORD/`cat redis.password`/" redis/redis.conf.template > redis/redis.conf

sudo docker build -t store redis

sudo docker run --name store -d --restart=always --network=internal \
  -p :6379:6379 store
```


### local ui

Build angular app and copy to ../local-server/static/ for serving.

```
sudo docker build -t local-ui --network=internal local-ui
sudo docker run --rm --network=internal -v `pwd`/local-server/static:/root/work/static/ local-ui
```

dev
```
sudo docker run -it --rm --name=local-ui --network=internal \
  -p :4200:4200 -p :9876:9876 \
  -v `pwd`/local-server/static:/root/work/static/ \
  local-ui /bin/bash
`npm bin`/ng serve --host=0.0.0.0
`npm bin`/ng build --prod
cp -R dist/local-ui/* static/
```
View on localhost:4200/live and localhost:4200/control

### local server

Note: redis in the following should probably be the remote server
(or perhaps another redis server should also be configured)

```
sudo docker build -t local-server --network=internal local-server
mkdir -p logs/local-server
sudo docker run -d --restart=always --name=local-server --network=internal \
  -p :8080:8080 -p 9123:9123/udp \
  -v `pwd`/local-server/static:/root/work/static/ \
  -v `pwd`/local-server/data:/root/work/data/ \
  -v `pwd`/selfies:/root/work/selfies/ \
  -v `pwd`/logs/local-server:/root/work/logs/ \
  -e REDIS_HOST=store -e REDIS_PASSWORD=`cat redis.password` \
  -e STORE_HOST=store -e STORE_PASSWORD=`cat redis.password` \
  -e DEBUG=1 \
  local-server
```
Note, replace REDIS_HOST and REDIS_PASSWORD if connecting to remote audience server.

Restart server:
```
sudo docker restart local-server
```

Note, forwards OSC message '/lhva/state' to audience-server via redis. 
Only (string) argument is the audience app state (see below).

Dev
```
sudo docker run -it --rm --name=local-server --network=internal \
  -p :8080:8080 -p 9123:9123/udp \
  -v `pwd`/local-server/static:/root/work/static/ \
  -v `pwd`/local-server/data:/root/work/data/ \
  -v `pwd`/selfies:/root/work/selfies/ \
  -v `pwd`/logs/local-server:/root/work/logs/ \
  -e REDIS_HOST=store -e REDIS_PASSWORD=`cat redis.password` \
  -e STORE_HOST=store -e STORE_PASSWORD=`cat redis.password` \
  -e DEBUG=1 \
  local-server /bin/bash
node dist/index.js
```

Prettify logs:
```
cat logs/local-server/XXX.log | sudo docker exec -i local-server ./node_modules/.bin/bunyan | more
```

Regenerate local config:
```
sudo docker exec -it local-server /bin/bash
node dist/make-local-config.js data/LHV_AudienceInteraction_SpreadSheet.xlsx \
  data/local-config-empty.json \
  data/local-config.json
```

Then probably restart local-server (as above).

### audience ui

Build angular2 web app and copy to ../audience-server/static/ for serving.

```
sudo docker build -t audience-app --network=internal audience-app
sudo docker run --rm --network=internal \
  -v `pwd`/html/2/:/root/work/static/ \
  audience-app
sed s/default/test1/ html/2/losing-her-voice/index.html > html/2/losing-her-voice/test1/index.html
sed s/default/show1/ html/2/losing-her-voice/index.html > html/2/losing-her-voice/show1/index.html
sed s/default/show2/ html/2/losing-her-voice/index.html > html/2/losing-her-voice/show2/index.html
```

dev
```
sudo docker run -it --rm --name=audience-app --network=internal \
  -p :4200:4200 -p :9876:9876 \
  -v `pwd`/html/2/:/root/work/static/ \
  audience-app /bin/bash
ng serve --host=0.0.0.0
ng build --prod --base-href=/2/losing-her-voice/ --deploy-url=/2/losing-her-voice/
cp -r dist/losing-her-voice static/
```

Note: if building and using elsewhere fix base href in index.html or 'ionic build'.
Also probably add production flag(s).

If serving from here, default is http://localhost:4200

### audience server

```
sudo docker build -t audience-server --network=internal audience-server
mkdir -p logs/audience-server
sudo docker run -it --rm --name=audience-server \
  --network=internal -p :8081:8081 \
  -v `pwd`/audience-server/data:/root/work/data/ \
  -v `pwd`/logs/audience-server:/root/work/logs/ \
  -e REDIS_HOST=store -e REDIS_PASSWORD=`cat redis.password` \
  -e DEBUG=1 \
  audience-server
```

Dev
```
sudo docker run -it --rm --name=audience-server \
  --network=internal -p :8081:8081 \
  -v `pwd`/audience-server/data:/root/work/data/ \
  -v `pwd`/logs/audience-server:/root/work/logs/ \
  -e REDIS_HOST=store -e REDIS_PASSWORD=`cat redis.password` \
  -e DEBUG=1 \
  audience-server /bin/bash
node dist/index.js
```

control redis...
```
sudo docker exec -it store redis-cli
auth PASSWORD (redis.password)
publish lhva.state.v2 "{\"performanceid\":\"test1\",\"state\":\"act1.scene1\"}"
```

publish POST, INTERVAL, RESET, act1.scene1, etc. (RELOAD - re-read config)

### Nginx public frontend

one-time...
```
sudo docker build -t frontend nginx
mkdir -p logs/nginx
```
Note: may fail on start-up if audience-server is not running.
```
sudo docker run --name frontend -d --restart=always --network=internal \
  -p :80:80 -p :443:443 -v `pwd`/html:/usr/share/nginx/html \
  -v `pwd`/logs/nginx:/var/log/nginx/log \
  -v `pwd`/nginx/conf.d:/etc/nginx/conf.d \
  frontend 
```

open (if in vagrant) [http://localhost:8000](http://localhost:8000)
