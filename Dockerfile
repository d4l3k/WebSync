FROM ubuntu:13.10
RUN apt-get update -y
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get upgrade -y

RUN apt-get install -y build-essential openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion pkg-config wget python-software-properties python python-setuptools libpq5 libpq-dev nodejs unoconv libhiredis-dev poppler-utils libreoffice-core libreoffice-calc libreoffice-writer ruby2.0 ruby2.0-dev nginx

# Java (not needed unless running puma)
# RUN apt-get install -y openjdk-7-jre-headless

# Node.JS manager
RUN apt-get install -y npm
RUN npm install -g pm2

# Ruby dependencies
RUN gem update --system
RUN gem install bundler rubygems-bundler

ADD . /src

# Download dependencies
RUN cd /src; bundle install; npm install

# Load balancer configuration.
RUN cp /src/config/nginx.conf /etc/nginx/

# Precompile assets
RUN cd /src; rake assets:clean; rake assets:precompile

CMD /src/bin/start.sh

EXPOSE 4567
EXPOSE 4568
