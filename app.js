
/**
 * Module dependencies.
 */

var express = require('express'),
config = require('./config'),
util = require('util'),
everyauth = require('everyauth'),
io = require('socket.io'),
Tumblr = require('tumblr2'),
parseCookie = require('./node_modules/express/node_modules/connect/lib/utils').parseCookie;

// Session store
var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

// setup everyauth - needs to be done before configuring app
everyauth.tumblr
    .consumerKey(config.consumerKey)
    .consumerSecret(config.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, user) {
        return true;
    })
    .handleAuthCallbackError( function (req, res) {
        res.render('login', { title: 'Tumblikes',
                              host: config.host,
                              error: 'You need to authorize Tumblikes in order to make this work, sorry!'
                            });
    })
    .redirectPath('/');

var app = module.exports = express.createServer();
// Configuration

var Logger = function(active) {
    this.active = active;
    this.log = function() {
        if (this.active) {
            console.log.apply(this, arguments);
        }
    };
};

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger());
    app.use(express.favicon());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
		'store': sessionStore,
        'secret': config.session_secret,
        'key': 'express.sid'
    }));
    app.use(everyauth.middleware());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.logger = new Logger(true);
});

app.configure('production', function(){
    app.use(express.errorHandler());
    app.logger = new Logger(false);
});

everyauth.helpExpress(app);

// Routes

app.get('/', function(req, res){
    if (req.session && req.session.auth && req.session.auth.loggedIn) {
        new Tumblr(getOAuthConfig(req.session)).getUserInfo(function(err, info) {
            app.logger.log("got user info:\n"+util.inspect(info));
            req.session.likes = info.user.likes;
            res.render('home', { title: 'Tumblikes',
                                 info: info,
                                 host: config.host,
                                 limit: config.likes_limit,
                                 avatar: req.session.auth.tumblr.user['avatar-url']});
        });
    } else {
        res.render('login', { title: 'Tumblikes', host: config.host });
    }
});

app.listen(config.port, function(){
    app.logger.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

var sio = io.listen(app);
sio.set('log level', 1);
sio.set('authorization', function(data, accept) {
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        // (literally) get the session data from the session store
        sessionStore.get(data.sessionID, function (err, session) {
            if (err || !session) {
                // if we cannot grab a session, turn down the connection
                accept('Error', false);
            } else {
                // save the session data and accept the connection
                data.session = session;
                accept(null, true);
            }
        });
    } else {
       return accept('No cookie transmitted.', false);
    }
});

sio.sockets.on('connection', function(socket) {
    var session = socket.handshake.session;
    app.logger.log('got handshake:\n'+util.inspect(session, false, null, true));

    socket.on('get_likes', function(last) {
        app.logger.log('getting likes for %s since %s', session.auth.tumblr.user.name, last);
        app.logger.log(session.likes);

        var num_likes = Math.min(session.likes, config.likes_limit);
        app.logger.log("getting "+num_likes+" likes");
        socket.emit('status', 'Determining photos to download...');
        socket.emit('progress', 0);

        var step = Math.min(num_likes, 20);
        var loops = Math.ceil(num_likes/step);
        var cnt = 0;
        var all_liked_posts = [];
        var cb = function(liked_posts, old_offset) {
            cnt++;
            all_liked_posts[old_offset/step] = liked_posts;
            socket.emit('progress', (cnt/loops)*100);
            if (old_offset === 0)
                socket.emit('set last', liked_posts[0].id);

            if (cnt == loops) {
                var stopped = false;
                var all_urls = all_liked_posts.reduce(function(acc, posts) {
                    var urls = [];
                    posts.forEach(function(post) {
                        if (post.id == last) {
                            app.logger.log("collecting urls stopped at %d for %d with %d", old_offset, post.id, last);
                            stopped = true;
                        }
                        if (!post.photos || stopped) return;
                        post.photos.forEach(function(photo) {
                            urls.push(photo.original_size.url);
                        });
                    });
                    return acc.concat(urls);
                }, []);
                app.logger.log("all urls: %s", util.inspect(all_urls));
                getPhotos(all_urls, socket);
            }
        };
        var offset = 0;
        var oAuthConfig = getOAuthConfig(session);
        while (offset+step <= num_likes) {
            getLikes(oAuthConfig, offset, step, cb);
            offset += step;
        }
    });
});

function getLikes(oAuthConfig, offset, step, cb) {
    app.logger.log("getting user likes for offset %d", offset);
    new Tumblr(oAuthConfig).getUserLikes({limit: step, offset: offset}, function(err, res) {
        app.logger.log("got likes with offset "+offset);
        //app.logger.log(util.inspect(res, false, null, true));
        if (err) {
            app.logger.log("error: "+err);
            return cb([], offset);
        }

        cb(res.liked_posts, offset);
    });
}

var path = require('path');
var Url = require('url');
var http = require('http');
var fs = require('fs');
function getPhotos(urls, socket) {
    var num_photos = urls.length;
    app.logger.log("got "+num_photos+" photo urls");

    if (num_photos === 0) {
        socket.emit('status', 'Sorry, there are no photos to download.');
        socket.emit('progress', 0);
        return;
    }
    socket.emit('status', 'Downloading '+num_photos+' photos...');
    socket.emit('progress', 0);

    var files = new FileStore(num_photos, socket);
    urls.forEach(function(url) {
        app.logger.log("checking url "+url);

        var filename = config.cache_dir+url.substring(url.lastIndexOf('/')+1);
        if (path.existsSync(filename)) {
            app.logger.log("file already downloaded "+filename);
            files.add(filename);
        } else {
            app.logger.log("getting file "+filename);
            url = Url.parse(url);
            http.get(url, function(response) {
                var file = fs.createWriteStream(filename);
                response.on('data', function(chunk){ file.write(chunk); });
                response.on('end', function(foo) {
                    file.end();
                    app.logger.log("wrote file "+filename);
                    files.add(filename);
                });
                response.on('close', function(err) {
                    console.error(err);
                    files.dec();
                });
            });
        }
    });
}

function FileStore(num_files, socket) {
    var files = [];

    this.has = function(filename) {
        return files.indexOf(filename) != -1;
    };

    this.add = function(filename) {
        if (this.has(filename)) {
            app.logger.log("got a dup! "+filename);
            this.dec();
        } else {
            files.push(filename);
        }
        socket.emit('progress', (files.length/num_files)*100);
        if (files.length == num_files) {
            // we're done downloading
            createZIP(files, socket);
        }
    };

    this.dec = function() {
        num_files--;
    };
}

var spawn = require('child_process').spawn;
var crypto = require('crypto');
function createZIP(files, socket) {
    var session = socket.handshake.session;

    // zip the file
    socket.emit('status', 'Creating ZIP file...');
    var sha = crypto.createHash('sha1');
    sha.update(Date.now()+session.auth.tumblr.user.name); // create hash for timestamp plus nick
    var zipfile = config.download_dir+sha.digest('hex')+'.zip';
    app.logger.log(zipfile);

    var zipOpts = ['-dcj', process.cwd()+'/public/'+zipfile].concat(files);
    var zip = spawn('zip', zipOpts);
    zip.stderr.on('data', function(data) {
        app.logger.log('stderr: ' + data);
    });
    socket.emit('progress', 0);
    zip.stdout.on('data', function(data) {
        if (data.toString().match(/(.+)\//)) {
            socket.emit('progress', (RegExp.$1/files.length)*100);
        }
    });
    zip.on('exit', function(code) {
        app.logger.log('child process exited with code ' + code);
        socket.emit('progress', 100);
        socket.emit('status', 'Your ZIP file has been created sucessfully.');
        socket.emit('download', config.host+zipfile);
        socket.emit('done');
    });
}

function getOAuthConfig(session) {
    var t = session.auth.tumblr;
    var c = {
        consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            accessTokenKey: t.accessToken,
            accessTokenSecret: t.accessTokenSecret
        };
    return c;
}
