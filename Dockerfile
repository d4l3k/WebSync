FROM ubuntu:13.10

RUN apt-get update -y
RUN apt-get upgrade -y

RUN apt-get install build-essential openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion pkg-config wget -y

RUN wget ftp://ftp.ruby-lang.org/pub/ruby/2.0/ruby-2.0.0-p353.tar.gz -O ruby.tar.gz
RUN tar xvf ruby.tar.gz
RUN cd ruby-2.0.0-p353; ./configure; make install
RUN gem update --system
RUN gem install bundler rubygems-bundler

#Add node repository to sources.list and update apt
RUN add-apt-repository ppa:chris-lea/node.js && apt-get update

#Install node.js
RUN apt-get install -y nodejs

ADD . /src

RUN cd /src; bundle install; npm install

EXPOSE 4567
EXPOSE 4568

