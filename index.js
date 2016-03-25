'use strict';

const co = require('co');
const coEvent = require('co-event');
const exec = require('child_process').exec;
const git = require('nodegit');
const path = require('path');
const rimrafAsync = require('bluebird').promisify(require('rimraf'));
const uuid = require('uuid');

/**
 * @function tremble
 * Create a test runner instance.
 * @param {Object} options
 * @param {string} options.repository
 * @param {string} options.branch
 * @param {string} options.command
 * @param {string} options.directory
 * @param {string} options.timeout
 * @param {stream.Writable} options.out
 */
var tremble = co.wrap(function *(options, cb) {
  const dir = options.directory || path.join(__dirname, 'tmp', uuid.v4());
  try {
    var cloneOptions = new git.CloneOptions();
    cloneOptions.checkoutBranch = options.branch;

    var repo = yield git.Clone(
      options.repository,
      dir,
      cloneOptions
    );
    var commit = yield repo.getBranchCommit(options.branch);
    yield git.Checkout.tree(repo, commit);

    var child = exec(options.command, {cwd: dir, timeout: options.timeout || 0});

    if (options.out && options.out.write) {
      child.stdout.pipe(options.out);
      child.stderr.pipe(options.out);
    }
    var e = yield coEvent(child);
    while (e) {
      switch (e.type) {
        case 'exit':
          if (typeof cb === 'function') {
            return cb(null, e.args[0]);
          }
          return e.args[0];
        default:
          break;
      }
      e = yield coEvent(child);
    }
  } catch (e) {
    if (typeof cb === 'function') {
      return cb(e);
    }

    throw e;
  } finally {
    yield rimrafAsync(dir, {disableGlob: true});
  }
});

module.exports = tremble;
