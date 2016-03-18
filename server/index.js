'use strict';

const bunyan = require('bunyan');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('mz/fs');
const morgan = require('morgan');
const path = require('path');
const tremble = require('../');
const uuid = require('uuid');
const wrap = require('co-express');

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
    var merge = req.body.object_attributes;
    var line;
    try {
      line = {
        result: 'failure',
        id: '#' + merge.id,
        commitId: merge.last_commit.id,
        commitUrl: merge.last_commit.url,
        commitAuthor: merge.last_commit.author,
        commitMessage: merge.last_commit.message
      };

      var code = yield tremble({
        repository: merge.source.git_http_url,
        branch: merge.source_branch,
        command: options.command,
        directory: path.join(options.dataDir, 'tmp', uuid.v4())
      });

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
    } catch (e) {
      internalLog.error(e);

      return res.status(500).json({
        error: 'Server error or bad request.'
      });
    }
  }));

  return app;
};

module.exports = trembleServer;
