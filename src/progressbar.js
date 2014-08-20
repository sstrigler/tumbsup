module.exports = function(socket, steps) {

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