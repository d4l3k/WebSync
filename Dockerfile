FROM ubuntu:13.10

RUN apt-get update -y
RUN apt-get upgrade -y

RUN apt-get install -y build-essential openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion pkg-config wget python-software-properties python python-setuptools libpq5 libpq-dev

# Java (not needed unless running puma)
# RUN apt-get install -y openjdk-7-jre-headless

# File conversion dependencies
RUN apt-get install -y poppler-utils libreoffice-core libreoffice-calc libreoffice-writer

# Install unoconv (can this be installed from apt-get?)
RUN wget https://github.com/dagwieers/unoconv/archive/0.6.tar.gz
RUN tar xvf 0.6.tar.gz
RUN cd unoconv-0.6; make install

# Install hiredis

RUN wget https://github.com/redis/hiredis/archive/v0.11.0.tar.gz
RUN tar xvf v0.11.0.tar.gz
RUN cd hiredis-0.11.0; make install

# Install ruby
RUN wget ftp://ftp.ruby-lang.org/pub/ruby/2.0/ruby-2.0.0-p353.tar.gz -O ruby.tar.gz
RUN tar xvf ruby.tar.gz
RUN cd ruby-2.0.0-p353; ./configure; make install
RUN gem update --system
RUN gem install bundler rubygems-bundler

#Add node repository to sources.list and update apt
RUN add-apt-repository ppa:chris-lea/node.js && apt-get update

#Install node.js
RUN apt-get install -y nodejs

RUN npm install -g pm2

ADD . /src

RUN cd /src; bundle install; npm install

# Load balancer configuration.
RUN apt-get install nginx
RUN cp /src/config/nginx.conf /etc/nginx/

EXPOSE 4567
EXPOSE 4568

