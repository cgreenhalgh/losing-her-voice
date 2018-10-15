# Losing Her Voice Local Server

## Build / dev

```
sudo docker network create --driver bridge internal
sudo docker build -t local-server --network=internal .
sudo docker run -it --rm --name=local-server --network=internal -p :8080:8080 -v `pwd`/static:/root/work/static/ local-server /bin/bash
node dist/index.js
```


