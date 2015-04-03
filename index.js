#!/usr/bin/env node

var stream = require('stream');
var util = require('util');
var minimist = require('minimist');
var debug = require('debug')('cloudwatchlogs');
var cwlogger = require('./cwlogger.js');

function CloudWatchLogsStream (opts) {
  debug('opts', opts);
  stream.Writable.call(this);
  this.logGroupName = opts.logGroupName;
  this.logStreamName = opts.logStreamName;
  this.sequenceToken = null;
  this.cwlogger = cwlogger(opts);
  this.firstMsg =  null;

  var self = this;
  self.cwlogger.createLogGroup(self.logGroupName, function(err) {
    if (err) return self.emit('error', err);
    self.cwlogger.createLogStream(self.logGroupName, self.logStreamName, function(err) {
      if (err) return self.emit('error', err);
      self._write = write;
      if (self.firstMsg) {
        self._write(self.firstMsg.chunk, self.firstMsg.encoding, self.firstMsg.done);
      }
    });
  });
};
util.inherits(CloudWatchLogsStream, stream.Writable);

function write (chunk, encoding, done) {
  var self = this;
  // TODO - need to batch these! Single events only for testing now..
  var params = {
    logEvents: [{
      message: chunk.toString(),
      timestamp: new Date().getTime()
    }],
    logGroupName: self.logGroupName,
    logStreamName: self.logStreamName,
    sequenceToken: self.sequenceToken
  };

  this.cwlogger.putLogEvents(params, function(err, data) {
    if (err) return self.emit('error', err);

    self.sequenceToken = data.nextSequenceToken;
    done();
  });
}

CloudWatchLogsStream.prototype._write = function (chunk, encoding, done) {
  this.firstMsg = {
    chunk: chunk,
    encoding: encoding,
    done: done
  };
};

function main() {
  var argv = minimist(process.argv.slice(2), {
    alias: {
      'accessKeyId': 'a',
      'secretAccessKey': 's',
      'region': 'r',
      'logGroupName': 'g',
      'logStreamName': 't',
    }
  });

  if (!(argv.accesskey || argv.secretkey || argv.groupname || argv.streamname || argv.region)) {
    console.log('Usage: cloudwatchlogs [-a ACCESS_KEY] [-s SECRET_KEY]\n' +
                '                         [-r REGION] [-g GROUP_NAME] [-t STREAM_NAME]');
    process.exit(1);
  }

  var str = new CloudWatchLogsStream(argv);
  process.stdin.pipe(str);
}

if (require.main === module) {
  main();
}
