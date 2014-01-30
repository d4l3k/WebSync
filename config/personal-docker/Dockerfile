FROM d4l3k/websync
MAINTAINER Tristan Rice, rice@outerearth.net

ADD . /config

RUN cp /config/config.json /src/config.json

ENTRYPOINT ["/src/bin/start.sh"]
USER daemon

EXPOSE 4567 4568
