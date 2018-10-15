# Losing Her Voice Local UI

## Build / dev

```
sudo docker network create --driver bridge internal
sudo docker build -t local-ui --network=internal .
sudo docker run -it --rm --name=local-ui --network=internal -p :4200:4200 -p :9876:9876 -v `pwd`/../local-server/static:/root/work/static/ local-ui /bin/bash
```


