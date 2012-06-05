var util= require('util'),
config = require('../config'),
T = require('tumblr2');

/*
 * GET home page.
 */

exports.index = function(req, res){
    if (req.loggedIn) {
        var u = req.user.tumblr;
        var c = {
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            accessTokenKey: u.accessToken,
            accessTokenSecret: u.accessSecret
        };
        console.log(c);
        var t = new T(c);
        t.getUserLikes(function(err, response) {
            console.log(util.inspect(response, false, null, true));
            res.render('home', { title: 'tumblikes', likes: response.liked_posts });
        });
    } else {
        res.render('login', { title: 'tumblikes' });
    }
};