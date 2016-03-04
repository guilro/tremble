# tremble
Tremble is a very simple CI tool in Javascript.

![dependencies](https://david-dm.org/guilro/tremble.svg)

## Usage

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
