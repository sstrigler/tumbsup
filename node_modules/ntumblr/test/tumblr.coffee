fs     = require('fs')
Tumblr = require('./../src/tumblr')
config = JSON.parse(fs.readFileSync('config.json'))
photo  = fs.readFileSync('test/assets/50-photo.jpg')
require('console-trace')

describe "Tumblr", ->

  beforeEach ->
    @tumblr = new Tumblr
      consumerKey: config.consumerKey
      consumerSecret: config.secretKey
      accessTokenKey: config.accessToken
      accessTokenSecret: config.accessTokenSecret
      host: config.host

  it "should return blog info", (done)->
    @tumblr.get 'info', (err, data, response)->
      data = JSON.parse(data)
      data.should.have.keys('response', 'meta')
      
      data.response.blog.should.have.keys([
                                          'title'
                                          'posts'
                                          'name'
                                          'url'
                                          'updated'
                                          'description'
                                          'ask' ])

      done()
    
  it "should return posts", (done)->
    @tumblr.get 'posts', (err, data, response)->
      postsData = JSON.parse(data).response.posts

      postsData.forEach (post)->
        keyList = [
          'blog_name'
          'id'
          'post_url'
          'type'
          'date'
          'timestamp'
          'format'
          'reblog_key'
          'tags'
          'note_count'
          'can_reply'
          'highlighted'
          'liked'
        ]
        switch post.type
          when 'text'
            prop = 'body'
          when 'photo'
            prop = 'photos'
          when 'quote'
            prop = 'source'

          when 'link'
            prop = 'url'

        post.should.have.property prop

      done()

  it "should return only text posts", (done)->
    @tumblr.get 'posts', type: 'text', (err, data, response)->
      postsData = JSON.parse(data).response.posts
      for post in postsData
        post.type.should.equal('text')

      done()
      

  it "should return only one text post", (done)->

    filterParam =
      type: 'text'
      limit: 1
    
    @tumblr.get 'posts', filterParam, (err, data, response)->
      post = JSON.parse(data).response.posts
      post.should.have.lengthOf(1)
      post[0].type.should.equal('text')
      done()
  
  it "should create new Text Post as draft", (done)->
    postObj =
      type: 'text'
      title: 'Demo Post'
      body: 'Having a nice day :D'
      status: 'draft'

    @tumblr.post postObj, (err, data, response)->
      data = JSON.parse(data)
      data.should.have.property('meta')
      data.meta.should.have.property('status', 201)
      data.meta.should.have.property('msg', 'Created')
      data.response.should.have.property('id')
      done()

  it "should delete a post", (done)->

    postObj =
      type: 'text'
      title: 'Demo Post'
      body: 'Having a nice day :D'

    @tumblr.post postObj, (err, data, response)=>
      data = JSON.parse(data)
      newPostId = data.response.id

      #console.log "new Post is created"

      @tumblr.delete id: newPostId, (err, data, response)->
        data = JSON.parse(data)
        data.meta.should.have.property('status', 200)
        data.meta.should.have.property('msg', "OK")

        done()

  
  it "should edit a post", (done)->

    postObj =
      type: 'text'
      title: 'Edit Demo Post'
      body: 'Having a nice day :D ! \' ( ) * - . _ ~'

    @tumblr.post postObj, (err, data, response)=>
      data = JSON.parse(data)
      newPostId = data.response.id

      #console.log "new Post is created"
      
      postObj =
        id: newPostId
        title: 'Edit Demo Post Edited'

      @tumblr.edit postObj, (err, data, response)=>
        data = JSON.parse(data)
        data.meta.should.have.property('status', 200)
        data.meta.should.have.property('msg', "OK")
        #console.log "Post edited"

        @tumblr.get 'posts', id: newPostId, (err, data, response)=>
          postsData = JSON.parse(data).response.posts
          postsData[0].should.have.property('title', 'Edit Demo Post Edited')
          
          @tumblr.delete id: newPostId, (err, data, response)=>
            #console.log "Post Deleted"
            done()
  
  it "should create new Photo Post", (done)->

    postObj =
      type: 'photo'
      data: fs.readFileSync('test/assets/50-photo.jpg')

    encodedAuth = fs.readFileSync('test/assets/url-encoded-auth.txt').toString('utf-8')

    @tumblr.post postObj, (err, data, response)=>
      data = JSON.parse(data)
      data.should.have.property('meta')
      data.meta.should.have.property('status', 201)
      data.meta.should.have.property('msg', 'Created')
      data.response.should.have.property('id')
      done()

  it "should create new Photoset Post", (done)->

    postObj =
      type: 'photo'
      data: [ photo,
              photo ]

    @tumblr.post postObj, (err, data, response)->
      data = JSON.parse(data)
      data.should.have.property('meta')
      data.meta.should.have.property('status', 201)
      data.meta.should.have.property('msg', 'Created')
      data.response.should.have.property('id')
      done()
