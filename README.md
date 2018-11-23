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

Build ionic progressive web app and copy to ../audience-server/static/ for serving.

```
sudo docker build -t audience-app --network=internal audience-app
sudo docker run --rm ---network=internal -v `pwd`/audience-server/static:/root/work/static/ audience-app
```

dev
```
sudo docker run -it --rm --name=audience-app --network=internal -p :8100:8100 -v `pwd`/audience-server/static:/root/work/static/ audience-app /bin/bash
ionic serve
ionic build
```

Note: fix base href in index.html or 'ionic build'

### audience server

```
sudo docker build -t audience-server --network=internal audience-server
sudo docker run -it --rm --name=audience-server --network=internal -p :8081:8081 -v `pwd`/audience-server/static:/root/work/static/ audience-server
```

Dev
```
sudo docker run -it --rm --name=audience-server --network=internal -p :8081:8081 -v `pwd`/audience-server/static:/root/work/static/ audience-server /bin/bash
node dist/index.js
```

