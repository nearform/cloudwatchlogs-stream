# Stream interface to CloudWatch Logs

Nice streaming interface to [CloudWatch Logs](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/WhatIsCloudWatchLogs.html). Can be used from code or as a standalone Agent.

## Install

```
npm install cloudwatchlogs-stream --save
```

Or to install globally as an Agent:

```
npm install -g cloudwatchlogs-stream --save
cloudwatchlogs -h
```

## Usage

See `cloudwatchlogs --help`.

Example code:

```
var opts = {
  'accessKeyId': 'ACCESS_KEY',
  'secretAccessKey': 'SECRET_KEY',
  'region': 'REGION',
  'logGroupName': 'GROUP_NAME',
  'logStreamName': 'STREAM_NAME',
  'bulkIndex': 10,
  'timeout': 20  // seconds
  };
var stream = new CloudWatchLogsStream(opts);
something.pipe(stream)  
```

Example command line:

```
tail -f my.log | cloudwatchlogs -a ACCESSKEY -s SECRET_KEY -r REGION -g GROUP_NAME -t STREAM_NAME -b 20 -o 20

```

