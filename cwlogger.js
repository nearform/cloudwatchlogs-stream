var AWS = require('aws-sdk');

// Global AWS config: http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html
// CloudWatchLogs API: http://docs.amazonaws.cn/en_us/AWSJavaScriptSDK/latest/AWS/CloudWatchLogs.html

module.exports = function cwlogger(opts) {
  var cloudWatchLogs = new AWS.CloudWatchLogs(opts);

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function createLogResourseFunction(name) {
    return function(params, cb) {
      cloudWatchLogs['create' + capitalize(name)](params, function(err, data) {
        if (err && err.code === 'ResourceAlreadyExistsException') {
          return cb();
        }
        return cb(err, data);
      });
    }
  }

  var _createLogGroup = createLogResourseFunction('logGroup');
  var _createLogStream = createLogResourseFunction('logStream');

  function createLogGroup(logGroupName, cb) {
    var params = {
      logGroupName: logGroupName
    };
    _createLogGroup(params, cb);
  }

  function createLogStream(logGroupName, logStreamName, cb) {
    var params = {
      logGroupName: logGroupName,
      logStreamName: logStreamName
    };
    _createLogStream(params, cb);
  }


  var re = /expected sequenceToken is: (\w+)/;
  function putLogEvents(params, cb) {
    cloudWatchLogs.putLogEvents(params, function(err, data) {
      if (err && err.code === 'InvalidSequenceTokenException') {
        var match = re.exec(err.message);
        if (!match) return cb(err);

        // retry once more..
        var sequenceToken = match[1];
        params.sequenceToken = sequenceToken;
        return cloudWatchLogs.putLogEvents(params, cb);
      }
      return cb(err, data);
    });
  }

  return {
    createLogGroup: createLogGroup,
    createLogStream: createLogStream,
    putLogEvents: putLogEvents
  }
}