'use strict';

const bunyan = require('bunyan');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('mz/fs');
const morgan = require('morgan');
const path = require('path');
const tremble = require('../');
const stream = require('stream');
const uuid = require('uuid');
const wrap = require('co-express');
const _ = require('lodash');

/**
 * @function trembleServer
 * Create a server instance
 * @param {Object} options          Options to send to the server
 * @param {string} options.dataDir  Directory where logs and history will be stored.
 * @param {string} options.command  Command to run in the project.
 * @param {string} options.pageTitle Page title for the web interface.
 * @return {Object} An Express app fully configured. Run listen() on it.
 */
var trembleServer = options => {
  const app = express();
  const testsLogFileName = path.join(options.dataDir, 'tests.log');
  const errorsLogFileName = path.join(options.dataDir, 'error.log');
  const historyLog = bunyan.createLogger({
    name: 'ci',
    streams: [{path: testsLogFileName}]
  });
  const internalLog = bunyan.createLogger({
    name: 'tremble-errors',
    streams: [{path: errorsLogFileName}]
  });

  app.set('views', path.join(__dirname, '/views'));
  app.set('view engine', 'jade');
  app.engine('jade', require('jade').__express);
  app.enable('trust proxy');

  // Global middlewares
  if (app.get('env') === 'development') {
    app.use(morgan('dev'));
  }

  app.use(bodyParser.json());

  app.use((req, res, next) => {
    res.locals.version = require('../package.json').version;
    res.locals.title = options.pageTitle || "Tremble v" + res.locals.version;

    return next();
  });

  app.get('/', wrap(function *(req, res) {
    var content = yield fs.readFile(testsLogFileName);
    var lines = content.toString()
      .split('\n').slice(0, -1)
      .map(line => (JSON.parse(line)));

    return res.render('index', {lines});
  }));

  app.post('/trigger/gitlab', wrap(function *(req, res) {
    try {
      var line = {
        result: 'failure',
        id: undefined,
        commitId: undefined,
        commitUrl: undefined,
        commitAuthor: undefined,
        commitMessage: undefined,
        stdout: ''
      };

      var out = new stream.Writable({
        write: function(chunk, encoding, next) {
          line.stdout += chunk;
          next();
        }
      });

      var repoParams = {
        repository: undefined,
        branch: undefined,
        command: options.command,
        directory: path.join(options.dataDir, 'tmp', uuid.v4()),
        out: out
      };

      switch (req.body.object_kind) {
        case 'merge_request':
          var merge = req.body.object_attributes;
          line.id = '#' + merge.id;
          line.commitId = merge.last_commit.id;
          line.commitUrl = merge.last_commit.url;
          line.commitAuthor = merge.last_commit.author;
          line.commitMessage = merge.last_commit.message;

          repoParams.repository = merge.source.git_http_url;
          repoParams.branch = merge.source_branch;
          break;
        case 'push':
          var commit = _.find(req.body.commits, {id: req.body.after});
          line.commitId = commit.id;
          line.commitUrl = commit.url;
          line.commitAuthor = commit.author;
          line.commitMessage = commit.message;

          repoParams.repository = req.body.project.git_http_url;
          repoParams.branch = req.body.ref.split('/').slice(-1)[0];
          break;
        default:
          break;
      }

      var code = yield tremble(repoParams);

      if (code === 0) {
        line.result = 'success';
        historyLog.info(line);
        return res.status(200).json({
          result: 'success'
        });
      }

      historyLog.info(line);
      return res.status(200).json({
        result: 'failure'
      });
    } catch (err) {
      internalLog.error(err);
      internalLog.error({req: req});
      if (app.get('env') === 'test') {
        console.error(err);
      }

      return res.status(500).json({
        error: 'Server error or bad request.'
      });
    }
  }));

  return app;
};

module.exports = trembleServer;
