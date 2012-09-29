
Tumblikes
========

A web based tool that allows you to download all photos and videos you
'liked' at Tumblr as a ZIP file. Tumblikes is based on node.js.

Prerequisites
-----------

Node as of version 0.8.x.
Tumblr oAuth API credentials. To get them got to http://tumblr.com and
create an account if you don't happen to have one. Then go to
http://www.tumblr.com/oauth/apps and register an application.

Installation and Running
---------------------

    $ git clone https://github.com/sstrigler/tumblikes.git
    $ cd tumblikes
    $ npm install
    $ cp config.js.example config.js
    $ vi config.js
    $ NODE_ENV=production node app.js

Then point your browser to the location configured at config.js and enjoy!

Copyright & Authors
------------------

(c) 2012 Stefan Strigler <stefan@strigler.de>

License
------

Tumblikes is licensed unter the GNU AFFERO GENERAL PUBLIC LICENSE as
of version 3. For details please have a look at the file COPYING that
should have been distributed with this software.

