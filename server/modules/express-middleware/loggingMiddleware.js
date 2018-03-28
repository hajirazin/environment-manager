/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

/**
 * Express Middleware to log requests and errors
 */

'use strict';

const fp = require('lodash/fp');
const miniStack = require('../miniStack');

let redactSecrets = fp.cloneDeepWith((value, key) => (/password/i.test(key) ? '********' : undefined));

let swaggerParams = fp.flow(
  fp.get(['swagger', 'params']),
  fp.mapValues(({ value }) => value),
  redactSecrets
);

let getUser = fp.compose(
  f => (fp.isFunction(f) ? f() : null),
  fp.get(['user', 'getName'])
);

let tryParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return undefined;
  }
};

let mini = miniStack.build();

let loggerMiddleware = logger => (req, res, next) => {
  let log = () => {
    let deprecated = fp.compose(fp.defaultTo(false), fp.get(['locals', 'deprecated']))(res);
    let message = deprecated ? 'HTTP request deprecated' : 'HTTP request';
    let statusCode = fp.get(['statusCode'])(res);
    let level;
    if (statusCode >= 500) {
      level = 'error';
    } else if (statusCode >= 400 || deprecated) {
      level = 'warn';
    } else {
      level = 'debug';
    }
    let responseFields;
    if (statusCode < 400) {
      responseFields = ['statusCode'];
    } else {
      responseFields = ['statusCode', 'body'];
    }
    let entry = {
      eventtype: 'http',
      req: {
        headers: {
          'user-agent': fp.get(['headers', 'user-agent'])(req)
        },
        id: fp.get('id')(req),
        ip: fp.get('ip')(req),
        method: fp.get('method')(req),
        originalUrl: fp.get('originalUrl')(req),
        params: req.originalUrl === '/api/token' ? redactSecrets(req.body) : swaggerParams(req)
      },
      res: fp.pick(responseFields)(res),
      user: req.originalUrl === '/api/token' ? fp.get(['body', 'username'])(req) : getUser(req)
    };
    logger[level]({ message: `Request: ${entry.req.method} ${entry.req.originalUrl} ResponseCode: ${entry.res.statusCode}`, entry });
  };
  let send = res.send;
  res.send = (content) => {
    if (content) {
      let s = content.toString();
      res.body = tryParse(s) || s;
    }
    log();
    send.call(res, content);
  };
  next();
};

let errorLoggerMiddleware = logger => (err, req, res, next) => {
  let log = () => {
    let message = 'HTTP error';
    let entry = {
      error: {
        message: fp.get(['message'])(err),
        stack: fp.compose(fp.truncate({ length: 1400 }), mini, fp.get(['stack']))(err)
      },
      eventtype: 'http error',
      req: {
        id: fp.get('id')(req),
        method: fp.get('method')(req),
        ip: fp.get('ip')(req),
        originalUrl: fp.get('originalUrl')(req),
        params: swaggerParams(req)
      },
      user: getUser(req)
    };
    logger.error(message, entry);
  };
  res.once('close', log);
  res.once('finish', log);
  next(err);
};

module.exports = {
  loggerMiddleware,
  errorLoggerMiddleware
};
