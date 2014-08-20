module.exports = function(active) {
    this.log = function() {
        if (active) {
            console.log.apply(this, arguments);
        }
    };
};