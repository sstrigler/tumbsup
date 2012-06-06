var util= require('util'),
config = require('../config'),
Tumblr = require('tumblr2');

/*
 * GET home page.
 */

exports.index = function(req, res){
    if (req.session && req.session.auth && req.session.auth.loggedIn) {
        var t = req.session.auth.tumblr;
        var c = {
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            accessTokenKey: t.accessToken,
            accessTokenSecret: t.accessTokenSecret
        };
        console.log(c);
        var tumblr = new Tumblr(c);
        tumblr.getUserLikes(function(err, response) {
            console.log(util.inspect(response, false, null, true));
            res.render('home', { title: 'tumblikes', likes: response.liked_posts });
        });
    } else {
        res.render('login', { title: 'tumblikes' });
    }
};