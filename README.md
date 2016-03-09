# tremble
Tremble is a very simple CI tool in Javascript. It provides a simple server

![dependencies](https://david-dm.org/guilro/tremble.svg)

## Server

Tremble provides a CI server ready to run (preferably in Docker), that you
can build in 3 steps.

1. Create a new node project with `npm init` and install Tremble with `npm install tremble --save`
2. Create an `index.js` file configuring and launching the server.
3. Create a `Dockerfile` and run `docker`.

`index.js`
```javascript
'use strict';

const server = require('tremble-ci/server');
const path = require('path');

server({

  command: 'bash ' + path.join(__dirname, 'my_validating_script.sh'), // Required. Do not forget to put absolute path for files not in your PATH
  dataDir: '/data' // Required
}).listen(3000, () => {
  console.log('CI server listening on port 3000 !');
});
```

`Dockerfile`
```
FROM node:4-onbuild
VOLUME ["/data"]
EXPOSE 3000
```

## Library

Tremble provides both promise and callback interface.
`tremble()` will return a promise if you do not provide a callback.

```javascript
require('tremble');

tremble({
    repository: 'https://github.com/guilro/commentit', // Required
    branch: 'master', // Required
    command: 'npm test', // Required, auto cwd in the repository
    directory: './tmp/gitdirectory', // Directory where to clone the repository, defaults to ./tmp/<randomNumber>, removed after test
    timeout: 0 // Timeout for your command
}, function(err, code) {
    if (err) {
     console.log(err);
    }

    console.log(code); // print the exit code
});
```
