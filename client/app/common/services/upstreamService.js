(function () {
  'use strict';

  angular
    .module('EnvironmentManager.common')
    .factory('upstreamservice', upstreamservice);

  upstreamservice.$inject = ['$http', 'UpstreamConfig'];

  function upstreamservice($http, UpstreamConfig) {
    return {
      all: all,
      dns: dns
    };

    /**
     * Get all upstream data, irrespective of environment.
     */
    function all() {
      return UpstreamConfig.getAll();
    }

    /**
     * Create a list of hosts for target {{environment}}.
     * A host contains the {{DNS/IP/Consul}} name, the ip and the environment from which it came.
     * @param {String} environmentName
     * @return {Array : [ HostList [ Host, Host ]]}
     */
    function dns(environmentName) {
      return UpstreamConfig.getAll()
        .then(getUpstreamsThatMatchEnvironment.bind(null, environmentName))
        .then(generateListOfHosts);
    }
  }

  function getUpstreamsThatMatchEnvironment(environmentName, upstreams) {
    return upstreams.filter(function (upstream) {
      return upstream.Value.EnvironmentName === environmentName;
    });
  }

  function generateListOfHosts(upstreams) {
    var results = [];
    upstreams.forEach(function (upstream) {
      var hosts = [];
      upstream.Value.Hosts.forEach(function (host) {
        hosts.push({
          host: host.DnsName,
          port: host.Port,
          environment: upstream.Value.EnvironmentName
        });
      });
      results.push(hosts);
    });
    return results;
  }
}());
