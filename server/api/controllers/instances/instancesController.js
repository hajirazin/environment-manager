/* Copyright (c) Trainline Limited, 2016. All rights reserved. See LICENSE.txt in the project root for license information. */
'use strict';

function getInstances(req, res) {
  res.json([{},{},{}]);
}

function getInstanceById(req, res) {
  res.json({});
}

function getInstanceAsgStandby(req, res) {
  res.json({});
}

function putInstanceAsgStandby(req, res) {
  res.json();
}

module.exports = {
  getInstances,
  getInstanceById,
  getInstanceAsgStandby,
  putInstanceAsgStandby
};
