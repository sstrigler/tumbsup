module.exports = function(num_files, socket, progressbar) {
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
