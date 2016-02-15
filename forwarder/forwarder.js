// forwarder.js

void function () {
	'use strict';

	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').setWriter(new require('log-writer')('forwarder-%s.log')).getLogger();
	var Statistics = require('../lib/statistics');
	var constants = require('../lib/constants');

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);

	var configs = require('../lib/default-config')('local-forwarder-config', 'forwarder-config', '\t');
	log.setLevel(configs.logLevel);

	var forwarderId = 20000;
	var myName = '(forwarder)';
	var stats = new Statistics(log, myName);

	configs.forwarders.forEach(function (config) {
		assert(Number(config.forwarderPort), 'config.forwarderPort');
		assert(Number(config.servicePort),   'config.servicePort');

		log.info(config);

		var serviceNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionService(c) {
			log.debug(myName, 'connected.');
			var s = net.connect(
					{port:config.forwarderPort, host:config.forwarderHost, allowHalfOpen:true},
					function connectionForwarder() {
				stats.countUp();
				s.pipe(c);
				c.pipe(s);
			});
			s.on('error', function error(err) {
				log.warn(myName, 'forwarder error', err);
				s.destroy();
			});
			s.on('end', function end() {
				log.debug(myName, 'forwarder disconnected');
			});

			var received = false;
			c.on('error', function error(err) {
				log.warn(myName, 'client error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug(myName, 'client disconnected');
				if (!received) {
					log.warn(myName, 'client has gone!');
				}
			});
			//c.on('readable', function readable() {
			//	var buff = c.read();
			//	if (!buff) return;

			//	if (!s) {
			//		s.write(buff);
			//	}
			//	received = true;
			//	c.removeListener('readable', readable);
			//});
		}).listen(config.servicePort, function listeningService() {
			log.info(myName, 'server bound. port', config.servicePort);
		});

	}); // configs.forEach

}();
