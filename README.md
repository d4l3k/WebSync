WebSync by Outer Earth Interactive [![Stories in Ready](https://badge.waffle.io/d4l3k/WebSync.png?label=ready)](https://waffle.io/d4l3k/WebSync)  
============
WebSync is a document editing tool similar to Google Drive or Microsoft Skydrive.

Features
----
* Persistent JSON object synced between clients
* Document, Spreadsheet, and Presentation editing and viewing.
* Tables
* Resizable Images & Tables
* User support
    - Icons and display names via Gravatar.
* Multi-user editing
* In document chat between users
* Revert changes to edited documents
* Document sharing
* Open source

TODO
----
I'm in the process of switching over to [Waffle.IO](https://waffle.io/d4l3k/WebSync). However, grepping through the source code is a good way to find things that need to be done, but here's a list of a few major things.
* Revert change previews
* Anonymous Users
* Better document sharing & permissions
* Zooming with regards to tables and resizing.
* Easier first-time deployment with automatic script group creation.
* Absolutely positioned images & tables
* Better documentation
* Redesign website to be a little more unique.

Dependencies
----
* WebSync requires Ruby, and Node.JS
* WebSync uses PostgreSQL for datastorage and redis for temporary data & pub/sub capabilities.
* Libre Office, unoconv and poppler is required for file upload & download.

[Ruby Version Manager](https://rvm.io/) is a great tool for handling multiple ruby version. WebSync works with Ruby 2.0.0 and should work with 1.9.3. At this time 2.1.0 doesn't work due to a Rice compilation error.

The Ruby dependencies need Bundler and you can install it by running `gem install bundler` and then `bundle` inside the WebSync directory to download the dependencies.

To install the Node.JS dependencies, just run `npm install`.

Some things (like databases) can be configured in "config.json" but a majority still require source changes.

Launching
----
Once the dependencies are installed and running, you should be able to run a development server by running:
```
rackup
./backend.js
```

This launches the main site on port 4567 and the web socket server on 4568.

To add an admin type:
```
rake "admin_add[sample@sample.com]"
```
and to remove:
```
rake "admin_remove[sample@sample.com]"
```

Once the site is running you need to go into the admin panel and configure the script groups. Most of these are preconfigured from `config.json`

Production
----

The production environment is currently setup for use with https://websyn.ca but should be fairly straight forward to setup with anything else.

In production, WebSync loads static asset files. These need to be compiled by running:
```
rake assets:precompile
```
To clean them up:
```
rake assets:clean
```

The configuration for the front end is located in `thin.yaml` and by default launches 4 workers on ports 3000-3003. NOTE: There is no built in load balancer for the front end. You should use something like haproxy or nginx to balance between the worker threads.

You can launch the front end by running:
```
thin start -C thin.yaml
```

For the backend, it's recommended you install [pm2](https://github.com/Unitech/pm2) (`npm install -g pm2`) and run the command:
```
pm2 start backend.js -i 4
```
which launches four worker threads that all listen on port 4568.

If you want to avoid pm2, you can just run `./backend.js` or `node backend.js` to get a single worker on port 4568.


Documentation
----

Some incomplete javascript documentation is available by running "./doc.rb" and viewing the file "public/doc_gen.html". This is also available at http://<WebSync URL>/documentation


License
----
Copyright (c) 2013 Tristan Rice

WebSync is licensed under the [MIT License](http://opensource.org/licenses/MIT).
