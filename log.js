"use strict";
var colors = require("colors");
var LOG;

LOG = (function () {
    function LOG() {

    }
    LOG.info = function (fileName, functionName, msgs) {
        msgs = msgs||"";
        functionName = functionName||"";
        fileName = fileName||"";
        console.log(colors.blue("["+Date()+" ] ", fileName, "-", functionName , " : ", msgs));
    }
    LOG.debug = function(fileName,functionName,msgs) {
        msgs = msgs||"";
        functionName = functionName||"";
        fileName = fileName||"";
        console.log(colors.green("["+Date()+" ] ", fileName, "-", functionName , " : ", msgs));
    }
    LOG.error = function(fileName,functionName,msgs) {
        msgs = msgs||"";
        functionName = functionName||"";
        fileName = fileName||"";
        console.log(colors.red("["+Date()+" ] ", fileName, "-", functionName , " : ", msgs));
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