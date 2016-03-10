/* globals describe, it */
'use strict';

const assert = require('assert');
const co = require('co');
const fs = require('fs');
const path = require('path');
const tremble = require('../index');
const uuid = require('uuid');

describe('promise interface', function() {
  this.timeout(20000);
  it(
    'should clone, run a command, return 0 exit code, leave nothing behind',
    co.wrap(function *() {
      const dir = path.join('./tmp', uuid.v4());
      var exitCode = yield tremble({
        repository: require('../package.json').repository.url,
        branch: 'master',
        directory: dir,
        command: 'bash -c "exit 0"'
      });
      assert.equal(exitCode, 0);
      assert.throws(() => {
        fs.statSync(dir);
      }, e => (e.code === 'ENOENT'), 'Directory is still present !');
    })
  );

  it(
    'should clone, run a command, return 100 exit code, leave nothing behind',
    co.wrap(function *() {
      const dir = path.join('./tmp', uuid.v4());
      var exitCode = yield tremble({
        repository: require('../package.json').repository.url,
        branch: 'master',
        directory: dir,
        command: 'bash -c "exit 100"'
      });
      assert.equal(exitCode, 100);
      assert.throws(() => {
        fs.statSync(dir);
      }, e => (e.code === 'ENOENT'), 'Directory is still present !');
    })
  );

  it(
    'should clone, error, not run the command, still leave nothing behind',
    co.wrap(function *() {
      const dir = path.join('./tmp', uuid.v4());
      try {
        yield tremble({
          repository: require('../package.json').repository.url,
          branch: 'non-existent-branch',
          directory: dir,
          command: 'bash -c "exit 0"'
        });
      } catch (e) {
        /*
        Ok there was an error ! (No need for checking error type, the only
        difference with previous tests is the non-existent-branch.
        */
        assert.throws(() => {
          fs.statSync(dir);
        }, e => (e.code === 'ENOENT'), 'Directory is still present !');

        return;
      }

      // Assert not reached
      throw new Error('no error were raised by tremble');
    })
  );
});
