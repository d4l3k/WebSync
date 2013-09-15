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
* WebSync requires ruby, rubygems, nodejs, and npm.
* WebSync uses PostgreSQL for datastorage and redis for temporary data & pub/sub capabilities. Redis may be replaced with ZeroMQ in the future.
* Libre Office & unoconv is required for file upload & export.

You can install the Ruby dependencies by running "bundle" and the Node.JS dependencies by running "npm install".

Some things can be configured in "config.json" but a majority still require source changes.

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

Once the site is running you need to go into the admin panel and configure the script groups.

The production environment is currently setup for use with https://websyn.ca

Documentation
----

Some incomplete javascript documentation is available by running "./doc.rb" and viewing the file "public/doc_gen.html". This is also available at http://<WebSync URL>/documentation


License
----
Copyright (c) 2013 Tristan Rice

WebSync is licensed under the [MIT License](http://opensource.org/licenses/MIT).
