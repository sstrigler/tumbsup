var Tumblr = require("tumblr2"),
    util = require('util');

function handleGetBlogPosts(app, config, blogId, offset, res) {
    return function(err, blog) {
        app.logger.log(util.inspect(err, false, null, true));
        app.logger.log(util.inspect(blog, false, null, true));
        if (err) {
            var error = (err.statusCode==404)?'Error: Blog not found':'Unkown Error';
            res.render('browse', { title: error,
                                   host: config.host,
                                   blogId: blogId,
                                   blog: false});
        } else {
            res.render('browse', {title:'Browsing '+blogId,
                                  host: config.host,
                                  blogId: blogId,
                                  offset: offset,
                                  blog: blog});
        }
    }
};

module.exports = function(app, config) {
    var tumblr = new Tumblr({consumerKey: config.consumerKey,
                             consumerSecret: config.consumerSecret});

    return {
        get: function(req, res) {
            var blogId = req.params.blogId || req.query.blogId;
            var offset = req.query.offset || 0;
            if (blogId) {
                if (blogId.indexOf('.') == -1) // presumably a plain tumblr-id
                    blogId += ".tumblr.com";
                app.logger.log(blogId);
                if (blogId.indexOf('://') != -1) // strip proto
                    blogId = blogId.substring(blogId.indexOf('://')+3)
                app.logger.log(blogId);
                if (blogId.indexOf('/') != -1) // strip trailing slash
                    blogId = blogId.substring(0, blogId.indexOf('/'));
                app.logger.log(blogId);
                tumblr.getBlogPosts({ blogId:blogId,
                                      type: ["photo"],
                                      offset: offset,
                                      reblog_info: true
                                    },
                                    handleGetBlogPosts(app, config, blogId, offset, res));
            } else {
                res.render('browse', {title:'Browse tumblelog',
                                      host: config.host,
                                      blogId: '',
                                      blog:false});
            }
        }
    };
};
