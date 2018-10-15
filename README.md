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
