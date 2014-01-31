FROM d4l3k/websync
MAINTAINER Tristan Rice, rice@outerearth.net

ADD . /config

RUN cp /config/config.json /src/config.json

USER daemon

EXPOSE 4567 4568
