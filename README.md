# [![WebSync](https://github.com/d4l3k/WebSync/raw/master/public/img/logo-github.png)](https://websyn.ca)
WebSync is a document editing tool similar to Google Drive or Microsoft Skydrive.

[![Priority Issues](https://badge.waffle.io/d4l3k/WebSync.png?label=ready&title=Issues)](https://waffle.io/d4l3k/WebSync)
[![Idea Issues](https://badge.waffle.io/d4l3k/WebSync.png?label=Low%20Priority&title=Ideas)](https://waffle.io/d4l3k/WebSync)
[![Build Status](https://travis-ci.org/d4l3k/WebSync.svg?branch=master)](https://travis-ci.org/d4l3k/WebSync)
[![Gem Status](https://img.shields.io/gemnasium/d4l3k/WebSync.svg?style=flat)](https://gemnasium.com/d4l3k/WebSync)
[![Code Climate](https://img.shields.io/codeclimate/github/d4l3k/WebSync.svg?style=flat)](https://codeclimate.com/github/d4l3k/WebSync)
[![Codacy Badge](https://img.shields.io/codacy/3eb607d1abb0496ea3e28b898b267685.svg?style=flat)](https://www.codacy.com/public/rice/WebSync)
[![Ruby Documentation Coverage](http://inch-ci.org/github/d4l3k/WebSync.svg?branch=master&style=flat)](http://inch-ci.org/github/d4l3k/WebSync)
[![Join the chat at https://gitter.im/d4l3k/WebSync](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/d4l3k/WebSync?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


# Features
[WebSyn.ca](https://websyn.ca) has a more up to date list of features. These might be incomplete:

* End-to-End Encryption powered by OpenPGP.
* Multi-user editing
* Notebook, Document, Spreadsheet, and Presentation editing and viewing.
* Document sharing
* Tables and Charts
* Resizable Images & Tables
* User support
    - Icons and display names via Gravatar.
* In document chat between users
* Revert changes to edited documents
* Persistent JSON object synced between clients
* Open source
* Self Hostable


# Dependencies
* WebSync requires Ruby, and Node.JS
* WebSync uses PostgreSQL for datastorage and redis for temporary data & pub/sub capabilities.
* Libre Office, unoconv and poppler is required for file upload & download.
* You probably need Java for the Closure javascript compressor (send me a message if it works without it).

[Ruby Version Manager](https://rvm.io/) is a great tool for handling multiple ruby version. WebSync is automatically tested against Ruby 2.0.0 and Ruby 2.1.2.

In adition to the previously mentioned depencies, some global depencies are needed as well.
```
gem install rubygems-bundler

sudo npm install -g bower
sudo npm install -g grunt-cli
sudo npm install -g pm2
```

To install project local dependencies for Ruby, Node.JS and bower, just run:
```
bundle install
npm install
bower install
```

Some things (like databases and initial javascript assets) can be configured in "config.json" but a majority still require source changes.

# Development Instance
Once the dependencies are installed and running, you should be able to run a development server by running:
```
rackup
bin/backend.js
```
This launches the main site on port 9292 and the web socket server on 4568.

To add an admin type:
```
rake "admin:add[sample@sample.com]"
```
and to remove:
```
rake "admin:remove[sample@sample.com]"
```

Once the site is running you need to go into the admin panel and configure the script groups. Most of these are preconfigured from `config.json`

# Configuration
The configuration files are located in the `config` folder. Most of the configuration options are located in `config.json`. This configures the database connections and assets.

## OAuth
WebSync uses [OmniAuth](https://github.com/intridea/omniauth) for authenticating against other resources. OmniAuth provides an easy way to authenticate against dozens of outside services. The only ones that are packaged with WebSync are Facebook and Google, but it's fairly easy to add new ones. To use OAuth with any of these services you need to acquire API keys and add them on the command line. For example:
```
GPLUS_KEY="kasdlflasdfasdf.apps.googleusercontent.com" GPLUS_SECRET="jfasdjl923n3n" unicorn ...
```
The built in options are `GPLUS_KEY`, `GPLUS_SECRET`, `FACEBOOK_KEY` and `FACEBOOK_SECRET`.

The OmniAuth providers are defined in `config/omniauth-providers.rb`. A list of available providers can be viewed on the [OmniAuth Wiki](https://github.com/intridea/omniauth/wiki/List-of-Strategies). To enable a provider you need to add the gem (eg. `omniauth-facebook`) to the `Gemfile` and configure in `config/omniauth-providers.rb` as follows. This is the Facebook provider configuration:

```ruby
# OmniAuth configuration:
provider :facebook, ENV['FACEBOOK_KEY'], ENV['FACEBOOK_SECRET']

# WebSync styling:
# style <provider>, <button color>, <button label>
style    :facebook, "#3b5998", "Facebook"

```

# Production
## Docker
[Docker](http://www.docker.io/) is a lightweight Linux container tool that allows for easy deployment. The first step is to install that by following the instructions on Docker's site. I've had issues with the Ubuntu Docker image on Digital Ocean (for some reason you couldn't access /src) and because of it WebSyn.ca doesn't use it anymore. The Docker images on Digital Ocean are out of date.

Second, modify `WebSync/config/personal-docker/config.json` with the production database information. The WebSync container does not include any databases. You need to configure Redis and PostgreSQL seperately.

Then you need to build the docker container with your changes. There are a few helper scripts in the `personal-docker` folder. To pull the `d4l3k/WebSync:latest` image and build your configuration:
```
sudo ./build.sh
```
You can then launch WebSync by running:
```
sudo ./run.sh websync-start
```
Or, enter an interactive shell by running:
```
sudo ./run.sh bash
```

## Manual
The production environment is currently setup for use with https://websyn.ca but should be fairly straight forward to set up with anything else.

In production, WebSync loads static asset files and documentation. These need to be compiled by running the following. Warning: This may take a long time.
```
rake assets:precompile
```
To clean them up:
```
rake assets:clean
```
### Front End
You have two options for the front end, Unicorn and Thin.

##### Unicorn
The WebSync Docker container uses Unicorn because it's faster and uses Unix sockets so there is only one exposed port.

You can launch Unicorn on port 4569 by running:
```
unicorn -c config/unicorn.rb
```

##### Thin
The configuration for the front end is located in `thin.yaml` and by default launches 4 workers on ports 3000-3003. NOTE: There is no built in load balancer for the front end. You should use something like haproxy or nginx to balance between the worker threads.

You can launch the front end by running:
```
thin start -C config/thin.yaml
```

### Backend
For the backend, it's recommended you install [pm2](https://github.com/Unitech/pm2) (`npm install -g pm2`) and run the command:
```
pm2 start bin/backend.js -i 4
```
which launches four worker threads that all listen on port 4568.

If you want to avoid pm2, you can just run `bin/backend.js` or `node node/backend.js` to get a single worker on port 4568.
## Troubleshooting

```
rake aborted!
LoadError: cannot load such file -- sprockets/sass/importer
```
If you get the above error, or something similar make sure you've installed the proper dependencies by running `bundle`. If the problem persists, try prefixing commands with `bundle exec ...`.

To make `bundle exec` unneeded please see https://rvm.io/integration/bundler

# Contributing

## TODO
WebSync uses [Waffle.IO](https://waffle.io/d4l3k/WebSync) for issues. Waffle.IO is just a nice way of organizing the [GitHub issues](https://github.com/d4l3k/WebSync/issues) and you can just look at those instead.


## Source Documentation
[WebSync Annotated Source Documentation](https://websyn.ca/documentation)

[JavaScript Documentation](https://websyn.ca/documentation/jsdoc/WebSync/0.1.0/index.html)

[Ruby Documentation](https://websyn.ca/documentation/yard/frames.html)

To generate the documentation you can run `rake documentation` or `rake assets:precompile`. Every WebSync server has the documentation available at `http://<server>:<port>/documentation`, assuming it has been generated. All production servers will have the documentation.

Here's a pretty graph of the setup on WebSyn.ca that I made for a talk.
![WebSync](https://i.imgur.com/eE3UNxS.png)


License
----
Copyright (c) 2015 [Tristan Rice](https://fn.lc)

WebSync is licensed under the [MIT License](http://opensource.org/licenses/MIT).
