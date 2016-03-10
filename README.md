# tremble
Tremble is a very simple CI tool in Javascript. It provides a simple server

![dependencies](https://david-dm.org/guilro/tremble.svg)

**Table of Contents**
 1. [Server](#server)
    1. [Supported services](#supported-services)
        1. [GitLab](#gitlab)
 2. [Library](#library)

## Server

Tremble provides a CI server ready to run (preferably in Docker), that you
can build in 3 steps.
1. Create a new node project with `npm init` and install Tremble with `npm install tremble-ci --save`
2. Create an `index.js` file configuring and launching the server.
3. Create a `Dockerfile` and run `docker`.

`index.js`
```javascript
'use strict';

const server = require('tremble-ci/server');
const path = require('path');

server({
  command: 'bash ' + path.join(__dirname, 'my_validating_script.sh'), // Required. Do not forget to put absolute path for files not in your PATH
  dataDir: path.join(__dirname, 'data') // Required, absolute path
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

### Supported services

Only [GitLab](https://about.gitlab.com/) merge requests events are supported at the moment.

#### GitLab

`/trigger/gitlab` accepts [GitLab merge request hooks](https://gitlab.com/gitlab-org/gitlab-ce/blob/master/doc/web_hooks/web_hooks.md). One you have installed a Tremble server, you can just register `{your host}/trigger/gitlab` as the hook for merge requests.

## Use only the library
You can use just the test runner without using the server. Tremble provides both promise and callback interface.
`tremble()` will return a promise if you do not provide a callback.

```javascript
const tremble = require('tremble-ci');

tremble({
    repository: 'https://github.com/guilro/commentit', // Required
    branch: 'master', // Required
    command: 'npm test', // Required, auto cwd in the repository
    directory: './tmp/gitdirectory', // Directory where to clone the repository, defaults to a tmp/<randomNumber> in the module directory, removed after test
    timeout: 0 // Timeout for your command
}, function(err, code) {
    if (err) {
     console.log(err);
    }

    console.log(code); // print the exit code
});
```
