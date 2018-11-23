FROM node:8.12.0-stretch

RUN npm install -g typescript

WORKDIR /root/work
COPY package.json /root/work/
COPY package-lock.json /root/work
RUN npm install --no-bin-links

VOLUME /root/work/data/
VOLUME /root/work/static/
COPY tsconfig.json /root/work/
COPY src/ /root/work/src/
RUN tsc

COPY static/ /root/work/static/

EXPOSE 8081

CMD ["node","server/dist/index.js"]