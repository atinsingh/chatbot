const color = require("colors");
var LOG;
color.setTheme({
    info : ['blue','bgYellow'],
    debug :['magenta',"bgWhite"],
    error :['red']

});
LOG = (function () {
    function LOG() {

    }
    LOG.info = function (fileName, functionName, msgs) {
        msgs = msgs||"";
        functionName = functionName||"";
        fileName = fileName||"";
        console.log("["+Date()+" ] " +fileName+"-"+functionName+" : "+msgs+"".blue);
    }
    LOG.debug = function(fileName,functionName,msgs) {
        msgs = msgs||"";
        functionName = functionName||"";
        fileName = fileName||"";
         console.log("["+Date()+" ] " +fileName+"-"+functionName+" : "+msgs+"".debug);
    }
    LOG.error = function(fileName,functionName,msgs) {
        msgs = msgs||"";
        functionName = functionName||"";
        fileName = fileName||"";
         console.log("["+Date()+" ] " +fileName+"-"+functionName+" : "+msgs+"".error);
    }
    return LOG;
})();

/*
LOG.prototype.info = function (fileName, functionName, msgs) {
    console.log("["+Date()+" ] " +fileName+"-"+functionName+" : "+msgs, color.blue);
}
LOG.prototype.error = function (fileName, functionName, msgs) {
    console.log("["+Date()+" ] " +fileName+"-"+functionName+" : "+msgs, color.red);
}
LOG.prototype.debug = function (fileName, functionName, msgs) {
    console.log("["+Date()+" ] " +fileName+"-"+functionName+" : "+msgs, color.green);
}
*/
module.exports = LOG;