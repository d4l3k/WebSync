FROM ubuntu:14.10
MAINTAINER Tristan Rice, rice@outerearth.net

RUN apt-get update -y
RUN apt-get install -y software-properties-common build-essential

RUN apt-get install -y openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion pkg-config wget python-software-properties python python-setuptools libpq5 libpq-dev nodejs unoconv libhiredis-dev poppler-utils libreoffice-core libreoffice-calc libreoffice-writer libreoffice-impress nginx npm openjdk-7-jre-headless



# Install JRuby
#ENV JRUBY_OPTS "--2.0 -Xcext.enabled=true"
#RUN wget http://jruby.org.s3.amazonaws.com/downloads/1.7.10/jruby-bin-1.7.10.tar.gz
#RUN tar xvf jruby-bin-1.7.10.tar.gz; ln -s /jruby-1.7.10/bin/jruby /jruby-1.7.10/bin/ruby
#ENV PATH /jruby-1.7.10/bin:$PATH

# Install MRI
#RUN wget -q ftp://ftp.ruby-lang.org/pub/ruby/2.0/ruby-2.0.0-p353.tar.gz -O ruby.tar.gz
#RUN tar xvf ruby.tar.gz
#RUN cd ruby-2.0.0-p353; ./configure --enable-shared; make install -j4

#RUN gem update --system
#RUN gem install bundler rubygems-bundler

# Install RBX
#RUN wget -q http://releases.rubini.us/rubinius-2.2.3.tar.bz2
#RUN tar xvf rubinius-2.2.3.tar.bz2
#RUN cd rubinius-2.2.3; bundle install; ./configure --prefix=/opt/; rake install
#ENV PATH /opt/rubinius/2.2/bin:$PATH
#RUN gem update --system
#RUN gem install rubysl racc bundler rubygems-bundler

RUN ln -s /usr/bin/nodejs /usr/bin/node

# PM2 Fix
RUN npm install -g git+https://github.com/juice49/pm2.git#master
#RUN npm install -g pm2
RUN mkdir /.pm2; mkdir /.pm2/pids/; mkdir /.pm2/logs/; chown -R daemon /.pm2; chmod 755 -R /.pm2

RUN npm install -g js-beautify docco

ADD . /src

# Load balancer configuration.
RUN cp /src/config/nginx.conf /etc/nginx/

RUN chown -R daemon:daemon /src; chmod 777 -R /src; chown -R daemon:daemon /home; chmod 777 -R /home; usermod -d /home daemon


ENV HOME /home


# Download dependencies
RUN cd /src; bundle install --deployment; npm install

#USER daemon
RUN cd /src; rake deploy

ENV PATH /src/bin:$PATH

EXPOSE 4567 4568
