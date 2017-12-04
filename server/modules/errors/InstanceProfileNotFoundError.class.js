/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let util = require('util');
let BaseError = require('./BaseError.class');

module.exports = function InstanceProfileNotFoundError(message, innerError) {
  this.name = this.constructor.name;
  this.message = message;
  this.innerError = innerError;

  Error.captureStackTrace(this, this.constructor);
};

util.inherits(module.exports, BaseError);
