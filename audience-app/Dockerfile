FROM node:8.12.0-stretch


WORKDIR /root/work

# bootstrap project
RUN npm install -g ionic cordova

COPY package.json /root/work/
COPY package-lock.json /root/work
RUN npm install

VOLUME /root/work/static/

COPY . /root/work/

RUN ionic build

EXPOSE 8100

CMD [ "cp", "-r", "www/*", "static/app/" ]