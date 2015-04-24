#!/usr/bin/env node

var stream = require('stream');
var util = require('util');
var minimist = require('minimist');
var debug = require('debug')('cloudwatchlogs');
var cwlogger = require('./cwlogger.js');
var Deque = require('collections/deque');

function CloudWatchLogsStream (opts) {
  debug('opts', opts);
  stream.Writable.call(this);
  this.logGroupName = opts.logGroupName;
  this.logStreamName = opts.logStreamName;
  this.bulkIndex = opts.bulkIndex;
  this.sequenceToken = null;
  this.cwlogger = cwlogger(opts);
  this.firstMsg =  null;
  this.queue = new Deque();

  var self = this;
  self.cwlogger.createLogGroup(self.logGroupName, function(err) {
    if (err) return self.emit('error', err);
    self.cwlogger.createLogStream(self.logGroupName, self.logStreamName, function(err, sequenceToken) {
      if (err) return self.emit('error', err);
      self.sequenceToken = sequenceToken;
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

  self.queue.push({
    message: chunk.toString(),
    timestamp: new Date().getTime()
  });

  var params = {
    logEvents: self.queue.toArray(),
    logGroupName: self.logGroupName,
    logStreamName: self.logStreamName,
    sequenceToken: self.sequenceToken
  };

  if(self.queue.length > self.bulkIndex) {
    this.cwlogger.putLogEvents(params, function(err, data) {
      if (err) return self.emit('error', err);

      self.queue.clear();
      self.sequenceToken = data.nextSequenceToken;
      done();
    });
  } else {
    done();
  }
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
      'bulkIndex': 'b'
    }
  });

  if (!(argv.accesskey || argv.secretkey || argv.groupname || argv.streamname || argv.region)) {
    console.log('Usage: cloudwatchlogs [-a ACCESS_KEY] [-s SECRET_KEY]\n' +
                '                      [-r REGION] [-g GROUP_NAME] [-t STREAM_NAME]\n' +
                '                      [-b BULK_INDEX]');
    process.exit(1);
  }

  var str = new CloudWatchLogsStream(argv);
  process.stdin.pipe(str);
}

if (require.main === module) {
  main();
}

module.exports = CloudWatchLogsStream;