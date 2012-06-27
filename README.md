
Tumblikes
========

A web based tool that allows you to download all photos you 'liked' at
Tumblr as a ZIP file. Tumblikes is based on node.js

Prerequisites
-----------

Node as of Version 0.6.x.
Tumblr oAuth API credentials. To get them got to http://tumblr.com and
create an account if you don't happen to have one. Then go to
http://www.tumblr.com/oauth/apps and register an application.

Installation and Running
---------------------

    $ git clone
    $ npm install
    $ cp config.js.example config.js
    $ vi config.js
    $ NODE_ENV=production node app.js

Then point your browser to the location configured at config.js and enjoy!
