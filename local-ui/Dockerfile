FROM node:8.12.0-stretch


WORKDIR /root/work

# bootstrap project
#RUN npm install -g @angular/cli
#ng new local-ui

COPY package.json /root/work/
COPY package-lock.json /root/work
RUN npm install

VOLUME /root/work/static/

COPY . /root/work/

RUN `npm bin`/ng build

EXPOSE 4200
EXPOSE 9876

CMD [ "cp", "dist/local-ui/*", "static/" ]
