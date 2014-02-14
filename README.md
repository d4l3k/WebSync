# ![WebSync](https://github.com/d4l3k/WebSync/raw/master/public/img/logo-github.png)
WebSync is a document editing tool similar to Google Drive or Microsoft Skydrive.

[![Priority Issues](https://badge.waffle.io/d4l3k/WebSync.png?label=ready&title=Issues)](https://waffle.io/d4l3k/WebSync)  [![Idea Issues](https://badge.waffle.io/d4l3k/WebSync.png?label=Low%20Priority&title=Ideas)](https://waffle.io/d4l3k/WebSync)

# Features
[WebSyn.ca](https://websyn.ca) has a nice list of features. These might be incomplete:

* Persistent JSON object synced between clients
* Notebook, Document, Spreadsheet, and Presentation editing and viewing.
* Tables
* Resizable Images & Tables
* User support
    - Icons and display names via Gravatar.
* Multi-user editing
* In document chat between users
* Revert changes to edited documents
* Document sharing
* Open source


# Dependencies
* WebSync requires Ruby, and Node.JS
* WebSync uses PostgreSQL for datastorage and redis for temporary data & pub/sub capabilities.
* Libre Office, unoconv and poppler is required for file upload & download.
* You probably need Java for the Closure javascript compressor (send me a message if it works without it).

[Ruby Version Manager](https://rvm.io/) is a great tool for handling multiple ruby version. WebSync has been tested with MRI Ruby 2.0.0. At this time 2.1.0 doesn't work due to a Rice compilation error, but hopefully will be supported sometime in the future.

The Ruby dependencies need Bundler and you can install it by running `gem install bundler` and then `bundle` inside the WebSync directory to download the dependencies.

To install the Node.JS dependencies, just run `npm install`.

Some things (like databases and initial javascript assets) can be configured in "config.json" but a majority still require source changes.

# Development Instance
Once the dependencies are installed and running, you should be able to run a development server by running:
```
rackup
./backend.js
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
# Production
## Docker
The easiest way to run WebSync (and most secure) is in [Docker](http://www.docker.io/). The first step is to install that by following the instructions on Docker's site. I've had issues with the Ubuntu Docker image on Digital Ocean (for some reason you couldn't access /src), butall of my manual installs on Arch Linux have worked just fine. The Docker image on Digital Ocean is out of date.

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
The production environment is currently setup for use with https://websyn.ca but should be fairly straight forward to setup with anything else.

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
pm2 start backend.js -i 4
```
which launches four worker threads that all listen on port 4568.

If you want to avoid pm2, you can just run `./backend.js` or `node backend.js` to get a single worker on port 4568.


# Contribution

## TODO
WebSync uses [Waffle.IO](https://waffle.io/d4l3k/WebSync) for issues. Waffle.IO is just a nice way of organizing the [GitHub issues](https://github.com/d4l3k/WebSync/issues) and you can just look at those instead.


## Source Documentation
[WebSync Annotated Source Documentation](https://websyn.ca/documentation)

WebSync uses Docco to automatically generate nicely formatted annotated source, but some of the code isn't that nicely documented. It would be great if you helped out with that. 

To generate the documentation you can run `rake documentation` or `rake assets:precompile`. Every WebSync server has the documentation available at `http://<server>:<port>/documentation`, assuming it has been generated. All production servers will have the documentation.


License
----
Copyright (c) 2014 Tristan Rice

WebSync is licensed under the [MIT License](http://opensource.org/licenses/MIT).
