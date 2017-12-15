'use strict';

let aws = require('aws-sdk');

function passSafetyNet(name) {
  let root = name.split('/')[0];
  if (root !== 'EnvironmentManagerConfigurationChange'
    && root !== 'EnvironmentManagerOperationsChange') {
    return false;
  }

  return true;
}

module.exports = (name) => {
  const sns = new aws.SNS();
  const valid = /^[a-zA-Z0-9\-\_]+$/;

  return new Promise((resolve, reject) => {
    if (!name) {
      reject('When creating a topic, a name parameter must be provided.');
    }
    if (name.length > 256) {
      reject('When creating a topic, a name parameter should be a maximum of 256 characters.');
    }
    if (!valid.test(name)) {
      /* eslint-disable max-len*/
      reject('When creating a topic, a name parameter must be made up of only uppercase and lowercase ASCII letters, numbers, underscores, and hyphens.');
    }
    if (!passSafetyNet(name)) {
      reject(`Current allowed topics list does not contain ${name}`);
    }

    sns.createTopic({ Name: name }, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};
