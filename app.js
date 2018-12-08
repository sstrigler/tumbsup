/**
 * Module dependencies.
 */

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index')(app, config);
var browseRouter = require('./routes/browse')(app, config);

var app = express();

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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Configuration
// app.configure(function(){
//     app.set('views', __dirname + '/views');
//     app.set('view engine', 'jade');
//     app.use(express.logger());
//     app.use(express.favicon());
//     app.use(express.bodyParser());
//     app.use(express.cookieParser());
//     app.use(express.session({
//         'store': sessionStore,
//         'secret': config.session_secret,
//         'key': 'express.sid'
//     }));
//     app.use(everyauth.middleware());
//     app.use(express.methodOverride());
//     app.use(app.router);
//     app.use(express.static(__dirname + '/public'));
// });
// app.sessionStore = sessionStore;

// app.configure('development', function(){
//     app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
//     app.logger = new Logger(true);
// });

// app.configure('production', function(){
//     app.use(express.errorHandler());
//     app.logger = new Logger(false);
// });

// everyauth.helpExpress(app);

// Routes
app.use('/', indexRouter);
app.use('/browse/:blogId?', browseRouter);

// app.get('/', indexRouter.get);
// app.get('/browse/:blogId?', browseRouter.get);

// app.listen(config.port, function(){
//     app.logger.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
// });

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;
