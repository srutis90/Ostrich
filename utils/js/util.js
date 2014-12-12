Array.prototype.split = function (N) {
    var slices = [];
    var l = this.length;
    var sliceLength = Math.ceil(this.length / N);
    for (var i = 0, startIndex = 0; i < N; i++, startIndex += sliceLength) {
        var s = this.slice(startIndex, startIndex + sliceLength);
        slices.push(s);
    }
    return slices;
};

Array.prototype.merge = function(){
    var result = [];
    for(var i=0; i<this.length; i++)
        result.push.apply(result, this[i]);
    return result;
};