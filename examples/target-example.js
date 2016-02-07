// target-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();
	var startStatistics = require('../lib/start-statistics');

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);
	var configs = require('./target-config.json');
	log.setLevel(configs.logLevel);

	var targetId = 20000;
	var myName = '(target)';

	var countUp = startStatistics(log, myName).countUp;

	configs.targets.forEach(function (config) {
		assert(Number(config.targetPort), 'config.targetPort');
		assert(       config.targetName,  'config.targetName');

		log.info(config);

		var targetNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionTarget(c) {
			log.debug(myName, 'connected.');
			var receivied = false;
			c.on('error', function error(err) {
				log.warn(myName, 'error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug(myName, 'disconnected');
				if (!receivied) {
					log.warn(myName, 'client has gone!');
				}
			});
			c.on('readable', function () {
				var buff = c.read();
				if (!buff) return;

				receivied = true;
				var words = buff.toString().trim().split(' ');
				log.trace(myName, 'read.', words.join(' '));
				setTimeout(function () {
					log.trace(myName, 'write.', words.join(' '));
					c.write('RESULT-TARGET ' + words[1] + ' ' + words[2] + '=' + eval(words[2]) + '\r\n');
					c.end();
					countUp();
				}, 2000);
			});
		}).listen(config.targetPort, function listeningTarget() {
			log.info(myName, 'server bound. port', config.targetPort);
		});

	}); // configs.forEach

}();
