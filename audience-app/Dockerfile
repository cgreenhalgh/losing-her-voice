FROM node:8.12.0-stretch


WORKDIR /root/work

# bootstrap project
RUN npm install -g @angular/cli
# cordova
# ng new losing-her-voice

COPY package.json /root/work/
COPY package-lock.json /root/work
RUN npm install

VOLUME /root/work/static/

COPY . /root/work/

RUN ng build --prod --base-href=/2/losing-her-voice/ --deploy-url=/2/losing-her-voice/

#EXPOSE 8100

CMD [ "cp", "-r", "dist/losing-her-voice", "static/" ]