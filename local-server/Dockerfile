FROM node:8.12.0-stretch

RUN npm install -g typescript

WORKDIR /root/work
COPY package.json /root/work/
COPY package-lock.json /root/work
RUN npm install --no-bin-links

VOLUME /root/work/data/
VOLUME /root/work/static/
VOLUME /root/work/selfies/
COPY tsconfig.json /root/work/
COPY src/ /root/work/src/
RUN tsc

COPY static/ /root/work/static/

# http
EXPOSE 8080
# OSC
EXPOSE 9123

CMD ["node","dist/index.js"]