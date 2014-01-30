FROM ubuntu:13.10
MAINTAINER Tristan Rice, rice@outerearth.net

RUN apt-get update -y
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get upgrade -y

RUN apt-get install -y build-essential openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion pkg-config wget python-software-properties python python-setuptools libpq5 libpq-dev nodejs unoconv libhiredis-dev poppler-utils libreoffice-core libreoffice-calc libreoffice-writer libreoffice-impress nginx npm openjdk-7-jre-headless 

# Install ruby
RUN wget ftp://ftp.ruby-lang.org/pub/ruby/2.0/ruby-2.0.0-p353.tar.gz -O ruby.tar.gz
RUN tar xvf ruby.tar.gz
RUN cd ruby-2.0.0-p353; ./configure --enable-shared; make install -j4
RUN gem update --system
RUN gem install bundler rubygems-bundler

ADD . /src

# Download dependencies
RUN cd /src; bundle install; npm install

# Load balancer configuration.
RUN cp /src/config/nginx.conf /etc/nginx/

# Precompile assets
RUN cd /src; rake assets:clean; rake assets:precompile

ENTRYPOINT /src/bin/start.sh
USER daemon

EXPOSE 4567
EXPOSE 4568
