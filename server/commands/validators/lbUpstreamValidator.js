/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let _ = require('lodash');

let valid = {
  isValid: true
};

let invalid = err => ({ isValid: false, err });

function validateDnsName(dnsName) {
  let consulMatch = /^[^\.]*?-[^\.]*$/.exec(dnsName);
  if (consulMatch) return valid;

  if (!_.includes(dnsName, '.')) {
    return invalid(`"${dnsName}" is not a valid as it contains no dots`);
  }

  let regex = /^([a-zA-Z0-9-]*?)\.(.*)$/;
  let matches = regex.exec(dnsName);

  if (!matches) {
    return invalid(`"${dnsName}" is not a valid as it contains illegal characters`);
  }

  let subDomain = matches[1];

  if (subDomain.startsWith('-') || subDomain.endsWith('-')) {
    return invalid(`"${dnsName}" is not valid as sub domains must not begin or end with a hyphen`);
  }

  let hyphensCount = (subDomain.match(/-/g) || []).length;
  if (hyphensCount > 3) return invalid(`"${dnsName}" is not valid as sub domains must not contain more than 3 hyphens`);

  return valid;
}

function validatePort(port, service) {
  let safePort = _.isNil(port) ? null : String(port);
  let safeBluePort = _.isNil(service.Value.BluePort) ? null : String(service.Value.BluePort);
  let safeGreenPort = _.isNil(service.Value.GreenPort) ? null : String(service.Value.GreenPort);

  if (safePort && safeBluePort && safeGreenPort) {
    if (safePort !== safeBluePort && safePort !== safeGreenPort) {
      let err = `Host port ${safePort} does not match blue or green port of ${service.ServiceName}`;
      return invalid(err);
    }
  }

  return valid;
}

exports.validate = (upstream, service) => {
  let hosts = upstream.Value.Hosts;

  if (hosts) {
    for (let host of hosts) {
      let dnsCheck = validateDnsName(host.DnsName);
      if (!dnsCheck.isValid) {
        return dnsCheck;
      }

      if (service) {
        let portCheck = validatePort(host.Port, service);
        if (!portCheck.isValid) {
          return portCheck;
        }
      }
    }
  }

  return valid;
};
