/* globals describe, it, after, before */
'use strict';

const assert = require('assert');
const co = require('co');
const fs = require('mz/fs');
const path = require('path');
const request = require('supertest');
const rimrafAsync = require('bluebird').promisify(require('rimraf'));
const server = require('../server');

describe('Request on the server', function() {
  this.timeout(20000);
  var context = {};

  before(co.wrap(function *() {
    context.appFailure = server({
      command: 'bash -c "echo failure reason; exit 1"',
      dataDir: path.join(__dirname, 'data'),
      pageTitle: 'Configured page title'
    });
    context.appSuccess = server({
      command: 'bash -c "exit 0"',
      dataDir: path.join(__dirname, 'data')
    });
  }));

  after(co.wrap(function *() {
    yield rimrafAsync(path.join(__dirname, 'data/*'));
  }));

  describe('POST /trigger/gitlab', function() {
    describe('with hook', function() {
      it('push', function(done) {
        request(context.appFailure)
          .post('/trigger/gitlab')
          .send(require('./payload.json').push)
          .expect('Content-Type', /json/)
          .expect(200, {
            result: "failure"
          }, done);
      });
    });

    describe('with failing test', function() {
      it('should return failure', function(done) {
        request(context.appFailure)
          .post('/trigger/gitlab')
          .send(require('./payload.json').merge)
          .expect('Content-Type', /json/)
          .expect(200, {
            result: "failure"
          }, done);
      });

      it('should write in tests.log, with stdout', co.wrap(function *() {
        var content = yield fs.readFile(path.join(__dirname, 'data/tests.log'));
        var lines = content.toString()
          .split('\n').slice(-2, -1)
          .map(line => (JSON.parse(line)));

        assert.equal(lines[0].result, 'failure');
        assert.equal(lines[0].stdout, 'failure reason\n');
      }));
    });
  });

  describe('POST /trigger/gitlab', function() {
    describe('with successful test', function() {
      it('should return success', function(done) {
        request(context.appSuccess)
          .post('/trigger/gitlab')
          .send(require('./payload.json').merge)
          .expect('Content-Type', /json/)
          .expect(200, {
            result: "success"
          }, done);
      });

      it('should record it in tests.log', co.wrap(function *() {
        var content = yield fs.readFile(path.join(__dirname, 'data/tests.log'));
        var lines = content.toString()
          .split('\n').slice(-2, -1)
          .map(line => (JSON.parse(line)));

        assert.equal(lines[0].result, 'success');
      }));
    });
  });

  describe('POST /trigger/gitlab', function() {
    describe('with error repo', function() {
      var payload = JSON.parse(JSON.stringify(require('./payload.json').merge));
      payload.object_attributes.source_branch = 'something wrong';
      it('should return error', function(done) {
        request(context.appSuccess)
          .post('/trigger/gitlab')
          .send(payload)
          .expect('Content-Type', /json/)
          .expect(500, {
            error: "Server error or bad request."
          }, done);
      });

      it('should record it in error.log', co.wrap(function *() {
        var content = yield fs.readFile(path.join(__dirname, 'data/error.log'));
        var lines = content.toString()
          .split('\n').slice(-3, -1)
          .map(line => (JSON.parse(line)));

        assert(lines[0].err.name);
        assert(lines[1].req.body);
      }));
    });
  });

  describe('GET /', function() {
    it('should return HTML page with tests history', function(done) {
      request(context.appFailure)
        .get('/')
        .expect(200, /\[FAILURE\](.|\n)*\[SUCCESS\]/, done);
    });

    it('should return HTML page with stdout', function(done) {
      request(context.appFailure)
          .get('/')
          .expect(200, /failure reason/, done);
    });

    it('should contain configured page title', function(done) {
      request(context.appFailure)
        .get('/')
        .expect(200, /Configured page title/, done);
    });
  });
});
