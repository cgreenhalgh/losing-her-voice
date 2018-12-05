# Nginx frontend

For audience-server, ready for migration to mrl-music.

Note: on virtual box `sendfile` must be disabled (`off`), but should be 
on for efficiency on deployment platform. See `nginx.conf`

Also note, typically nginx doesn't seem to start properly when the 
domain names in the config do not resolve, so typically other servers 
need to be set up and running first under docker.

