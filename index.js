'use strict';

const co = require('co');
const coEvent = require('co-event');
const exec = require('child_process').exec;
const git = require('nodegit');
const path = require('path');
const rimrafAsync = require('bluebird').promisify(require('rimraf'));
const uuid = require('uuid');

/**
 * Create a test runner instance.
 * @param {Object} options
 * @param {string} options.repository
 * @param {string} options.branch
 * @param {string} options.command
 * @param {string} options.directory
 * @param {string} options.timeout
 */
var tremble = co.wrap(function *(options, cb) {
  const dir = options.directory || path.join('./tmp', uuid.v4());
  try {
    var repo = yield git.Clone(options.repository, dir);
    var commit = yield repo.getBranchCommit(options.branch);
    yield git.Checkout.tree(repo, commit);

    var child = exec(options.command, {cwd: dir, timeout: options.timeout || 0});
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
