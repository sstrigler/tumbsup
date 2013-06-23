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
    .myHostname(config.host)
    .findOrCreateUser( function (sess, accessToken, accessSecret, user) {
        return true;
    })
    .handleAuthCallbackError( function (req, res) {
        res.render('login', { title: 'Tumbsup',
                              host: config.host,
                              error: 'You need to authorize Tumbsup in order to make this work, sorry!'
                            });
    })
    .redirectPath('/');

var app = module.exports = express.createServer();
// Configuration

var Logger = function(active) {
    this.log = function() {
        if (active) {
            console.log.apply(this, arguments);
        }
    };
};

// sets remote progress via socket
var Progressbar = function(socket, steps) {

    this.init = function() {
        this.step = 0;
        socket.emit('progress', 0);
        socket.emit('status', '');
        return this;
    };

    this.status = function(status) {
        socket.emit('status', status);
        return this;
    };

    this.next_step =  function() {
        this.step++;
        socket.emit('progress', (this.step/steps) * 100);
        return this;
    };

    this.progress = function(val) {
        socket.emit('progress', ((this.step/steps) * 100) + (1/steps) * val * 100);
        return this;
    };
};

var FileStore = function(num_files, socket, progressbar) {
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
        progressbar.progress(files.length/num_files);
        if (files.length == num_files) {
            // we're done downloading
            createZIP(files, socket, progressbar);
        }
    };

    this.dec = function() {
        num_files--;
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
        app.logger.log("got auth:" + util.inspect(req.session.auth));

        res.render('main', { title: 'Tumbsup',
                             host: config.host,
                             blog: req.session.auth.tumblr.user.blogs[0],
                             limit: config.likes_limit});
    } else {
        res.render('login', { title: 'Tumbsup', host: config.host });
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

    // we've got three steps to take:
    // * download followings
    // * determining photos to download
    // * download photos
    // * create zip file
    var progressbar = new Progressbar(socket, 4);

    socket.on('tumbsup', function(last) {

        var getLikes = function(followings_file) {
            var oAuthConfig = getOAuthConfig(session);

            app.logger.log('getting likes for %s since %s',
                           session.auth.tumblr.user.name,
                           last);
            app.logger.log(session.auth.tumblr.user.likes);

            var num_likes = Math.min(session.auth.tumblr.user.likes,
                                     config.likes_limit);
            app.logger.log("getting "+num_likes+" likes");
            progressbar.next_step().status('Determining posts to download...');

            var step = Math.min(num_likes, 20);
            var loops = Math.ceil(num_likes/step);
            var cnt = 0;
            var all_liked_posts = [];
            var cb = function(liked_posts, old_offset) {
                cnt++;
                all_liked_posts[old_offset/step] = liked_posts;
                progressbar.progress(cnt/loops);
                if (old_offset === 0)
                    socket.emit('set last', liked_posts[0].id);

                if (cnt == loops) {
                    var stopped = false;
                    var all_urls = all_liked_posts.reduce(function(acc, posts) {
                        var urls = [];
                        posts.forEach(function(post) {
                            if (post.id == last) {
                                app.logger.log(
                                    "collecting urls stopped at %d for %d with %d",
                                    old_offset, post.id, last);
                                stopped = true;
                            }
                            if (stopped)
                                return;
                            app.logger.log(
                                util.inspect(post, false, null, true));
                            if (post.type == 'video') {
                                if (post.video_url)
                                    urls.push(post.video_url);
                            } else if (post.type == 'photo' && post.photos) {
                                post.photos.forEach(function(photo) {
                                    urls.push(photo.original_size.url);
                                });
                            }
                        });
                        return acc.concat(urls);
                    }, []);
                    app.logger.log("all urls: %s", util.inspect(all_urls));

                    var files = new FileStore(all_urls.length+1,
                                              socket,
                                              progressbar);
                    files.add(followings_file);

                    getPhotos(all_urls, files, socket, progressbar);
                }
            };
            var offset = 0;
            while (offset+step <= num_likes) {
                getUserLikes(oAuthConfig, offset, step, cb);
                offset += step;
            }
        };

        getUserFollowing(session, progressbar, getLikes);

    }); // end socket.on
}); // end sio.sockets.on

function getUserFollowing(session, progressbar, then) {
    app.logger.log("getting %d followings", num_following);

    progressbar.init().status('Retrieving followings ...');

    var oAuthConfig = getOAuthConfig(session);

    var num_following = session.auth.tumblr.user.following;

    var tumblr = new Tumblr(oAuthConfig);

    var offset = 0;
    var limit = 20;

    var following = [];
    var num_requests = Math.ceil(num_following/limit);
    var num_responses = 0;

    var resultHandler = function(err, res) {
        num_responses++;

        progressbar.progress(num_responses/num_requests);

        app.logger.log(util.inspect(res, false, null, true));

        if (!err)
            following = following.concat(res.blogs);

        if (num_responses == num_requests ) {
            var filename = config.cache_dir+session.auth.tumblr.user.name
                +"_following.json";
            app.logger.log("got %d followings", following.length);
            var file = fs.createWriteStream(filename);
            file.write(JSON.stringify(following, null, 4));
            file.end();
            then(filename);
        }
    };

    while (offset < num_following) {
        tumblr.getUserFollowing({limit: limit, offset: offset},
                                resultHandler);
        offset += limit;
    }
}

function getUserLikes(oAuthConfig, offset, step, cb) {
    app.logger.log("getting user likes for offset %d", offset);
    new Tumblr(oAuthConfig).getUserLikes({limit: step, offset: offset},
                                         function(err, res) {
        app.logger.log("got likes with offset "+offset);
        //app.logger.log(util.inspect(res, false, null, true));
        if (err) {
            app.logger.log("error: "+err);
            return cb([], offset);
        }

        cb(res.liked_posts, offset);
    });
}

var Url = require('url');
var http = require('http');
var fs = require('fs');
function getPhotos(urls, files, socket, progressbar) {
    var num_photos = urls.length;
    app.logger.log("got "+num_photos+" urls");

    if (num_photos === 0) {
        progressbar.init().status('Sorry, there are no posts to download.');
        return;
    }
    progressbar.next_step().status('Downloading '+num_photos+' posts...');

    urls.forEach(function(url) {
        app.logger.log("checking url "+url);

        var filename = config.cache_dir+url.substring(url.lastIndexOf('/')+1);
        if (fs.existsSync(filename)) {
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
                    if (!files.has(filename))
                        files.dec();
                });
            });
        }
    });
}

var spawn = require('child_process').spawn;
var crypto = require('crypto');
function createZIP(files, socket, progressbar) {
    var session = socket.handshake.session;

    // zip the file
    progressbar.next_step().status('Creating ZIP file...');
    var sha = crypto.createHash('sha1');
    sha.update(Date.now()+session.auth.tumblr.user.name); // create hash for timestamp plus nick
    var zipfile = config.download_dir+sha.digest('hex')+'.zip';
    app.logger.log(zipfile);

    var zipOpts = ['-dcj', process.cwd()+'/public/'+zipfile].concat(files);
    var zip = spawn('zip', zipOpts);
    zip.stderr.on('data', function(data) {
        app.logger.log('stderr: ' + data);
    });
    zip.stdout.on('data', function(data) {
        if (data.toString().match(/(.+)\//)) {
            progressbar.progress(RegExp.$1/files.length);
        }
    });
    zip.on('exit', function(code) {
        app.logger.log('child process exited with code ' + code);
        progressbar.progress(1).status('Your ZIP file has been created sucessfully.');
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
