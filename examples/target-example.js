// target-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();

	log.info('node', process.version, path.basename(__filename));
	var configs = require('./target-config.json');
	log.setLevel(configs.logLevel);

	var targetId = 20000;

	configs.targets.forEach(function (config) {
		assert(       config.targetName,  'config.targetName');
		assert(Number(config.targetPort), 'config.targetPort');

		log.info(config);

		var targetNetSvr = net.createServer(function connectionTarget(c) {
			log.debug('(target) connected.');
			c.on('error', function error(err) {
				log.warn('(target) error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug('(target) disconnected');
			});
			c.write('example-target-message ' + (++targetId) + ' ' + config.targetName + '\r\n');
			c.pipe(c);
		}).listen(config.targetPort, function listeningTarget() {
			log.info('(target) server bound. port', config.targetPort);
		});

	}); // configs.forEach

}();
