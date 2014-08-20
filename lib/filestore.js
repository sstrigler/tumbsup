module.exports = function(app, config, num_files, socket, progressbar) {
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
            createZIP(app, config, files, socket, progressbar);
        }
    };

    this.dec = function() {
        num_files--;
    };
};

var spawn = require('child_process').spawn;
var crypto = require('crypto');
function createZIP(app, config, files, socket, progressbar) {
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

