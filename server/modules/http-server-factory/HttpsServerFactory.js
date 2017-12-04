/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let https = require('https');
const SslComponentsRepository = require('../sslComponentsRepository');

module.exports = function HttpsServerFactory() {
  let sslComponentsRepository = new SslComponentsRepository();

  this.create = function (application, parameters) {
    return sslComponentsRepository.get().then(
      sslComponents => new Promise((resolve) => {
        let port = parameters.port;
        let server = createServerByApplicationAndSslComponents(
          application, sslComponents
        );

        server.listen(port, () => resolve(server));
      })
    );
  };

  function createServerByApplicationAndSslComponents(application, sslComponents) {
    let options = {
      key: sslComponents.privateKey,
      cert: sslComponents.certificate
    };

    let server = https.createServer(options, application);
    return server;
  }
};
