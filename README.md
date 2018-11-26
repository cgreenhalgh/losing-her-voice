# Losing Her Voice Tech

Tech for the opera Losing Her Voice, by Elizabeth Kelly.

Copyright (c) 2018, The University of Nottingham

Status: just starting...

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
sudo docker run --rm ---network=internal -v `pwd`/local-server/static:/root/work/static/ local-ui
```

dev
```
sudo docker run -it --rm --name=local-ui --network=internal -p :4200:4200 -p :9876:9876 -v `pwd`/local-server/static:/root/work/static/ local-ui /bin/bash
`npm bin`/ng serve --host=0.0.0.0
```
View on localhost:4200

### local server

```
sudo docker build -t local-server --network=internal local-server
sudo docker run -it --rm --name=local-server --network=internal -p :8080:8080 -v `pwd`/local-server/static:/root/work/static/ local-server
```

Dev
```
sudo docker run -it --rm --name=local-server --network=internal -p :8080:8080 -v `pwd`/local-server/static:/root/work/static/ local-server /bin/bash
node dist/index.js
```

### audience ui

Build angular2 web app and copy to ../audience-server/static/ for serving.

```
sudo docker build -t audience-app --network=internal audience-app
sudo docker run --rm ---network=internal \
  -v `pwd`/audience-server/static:/root/work/static/ \
  -v `pwd`/audience-server/data:/root/work/data/ \
  -e REDIS_HOST=store -e REDIS_PASSWORD=`cat redis.password` \
  audience-app
```

dev
```
sudo docker run -it --rm --name=audience-app --network=internal \
  -p :4200:4200 -p :9876:9876 \
  -v `pwd`/audience-server/static:/root/work/static/ \
  audience-app /bin/bash
ng serve --host=0.0.0.0
ng build
```

Note: if building and using elsewhere fix base href in index.html or 'ionic build'.
Also probably add production flag(s).

If seving from here, default is http://localhost:4200

### audience server

```
sudo docker build -t audience-server --network=internal audience-server
sudo docker run -it --rm --name=audience-server \
  --network=internal -p :8081:8081 \
  -v `pwd`/audience-server/static:/root/work/static/ \
  -e REDIS_HOST=store -e REDIS_PASSWORD=`cat redis.password` \
  audience-server
```

Dev
```
sudo docker run -it --rm --name=audience-server \
  --network=internal -p :8081:8081 \
  -v `pwd`/audience-server/static:/root/work/static/ \
  -v `pwd`/audience-server/data:/root/work/data/ \
  -e REDIS_HOST=store -e REDIS_PASSWORD=`cat redis.password` \
  audience-server /bin/bash
node dist/index.js
```

control redis...
```
sudo docker exec -it store redis-cli
auth PASSWORD (redis.password)
publish lhva.state act1.scene1
```

publish POST, INTERVAL, RESET, act1.scene1, etc. (RELOAD - re-read config)

