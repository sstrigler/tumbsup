var Tumblr = require("tumblr2"),
    util = require('util');

function handleGetBlogPosts(app, config, req, res, offset) {
    return function(err, blog) {
        if (err) {
            app.logger.log(util.inspect(err, false, null, true));
            var error = (err.statusCode==404)?'Error: Blog not found':'Unkown Error';
            res.render('browse', { title: error,
                                   host: config.host,
                                   blogId: req.params.blogId,
                                   blog: false });
        } else {
            app.logger.log(util.inspect(blog, false, null, true));
            res.render('browse', { title:  blog.blog.title,
                                   host:   config.host,
                                   blogId: req.params.blogId,
                                   offset: offset,
                                   blog:   blog });
        }
    }
}

function redirect(req, res, blog) {
    res.redirect('http://'+req.headers['x-forwarded-host']+'/browse/'+blog);
}

module.exports = function(app, config) {
    return {
        get: function(req, res) {
            // query param given, nice but we do without
            if (req.query.blogId)
                return redirect(req, res, req.query.blogId);
            // no blog given at all
            if (!req.params.blogId)
                return res.render('browse', { title:'Browse tumblelog',
                                              host: config.host,
                                              blogId: '',
                                              blog:false });
            // presumably a plain tumblr-id
            if (req.params.blogId.indexOf('.') == -1) 
                return redirect(req, res, req.params.blogId += ".tumblr.com");

            var offset = req.query.offset || 0;
            var tumblr = new Tumblr({consumerKey:    config.consumerKey,
                                     consumerSecret: config.consumerSecret});

            tumblr.getBlogPosts({ blogId:      req.params.blogId,
                                  type:        ["photo"],
                                  offset:      offset,
                                  reblog_info: true
                                },
                                handleGetBlogPosts(app,
                                                   config,
                                                   req,
                                                   res,
                                                   offset)
                               );
        }
    };
};
