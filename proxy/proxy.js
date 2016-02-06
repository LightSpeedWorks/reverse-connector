// proxy.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();

	log.info('node', process.version, path.basename(__filename));
	var configs = require('./proxy-config.json');
	log.setLevel(configs.logLevel);

	assert(       configs.systemHost,  'configs.systemHost');
	assert(Number(configs.systemPort), 'configs.systemPort');
	assert(Number(configs.systemPool), 'configs.systemPool');

	configs.targets.forEach(function (config) {
		assert(       config.targetName,  'config.targetName');
		assert(       config.targetHost,  'config.targetHost');
		assert(Number(config.targetPort), 'config.targetPort');
		config = {targetName:config.targetName,
		          targetHost:config.targetHost,
		          targetPort:config.targetPort};

		log.info(config);

		var systemPoolSockets = [];

		while (systemPoolSockets.length < configs.systemPool)
			connectPool();

		function connectPool() {
			if (systemPoolSockets.length >= configs.systemPool)
				return;

			var using = false;

			var c = net.connect(configs.systemPort, configs.systemHost, function connectionSystem() {
				log.debug('(system) connected.');

				c.write('$REVERSE ' + config.targetName + ' HTTP/1.0\r\n\r\n');

				// c.removeListers('error');
				c.on('readable', function () {
					var buff = c.read();
					if (!buff) return;

					if (!using) {
						log.debug('(system) using.');

						remove();

						var s = net.connect(config.targetPort, config.targetHost, function connectionTarget() {
							log.debug('(target) connected.');
							s.pipe(c);
						});
						s.on('error', error);
						s.on('end', function end() {
							log.debug('(target) disconnected.');
							// c.end();
						});
						c.on('end', function end() {
							log.debug('(system) disconnected.');
							s.end();
						});

						function error(err) {
							log.warn('(target) error', err);
						}

						using = true;
					}

					if (s)
						s.write(buff);
					else {
						log.warn('(system) not enough! system pool.');
						c.end();
					}

				});
			});
			systemPoolSockets.push(c);

			c.on('error', error);
			c.on('end', end);

			function error(err) {
				log.warn('(system) error', err);
				remove(err);
			}

			function end() {
				log.debug('(system) disconnected. remain', systemPoolSockets.length);
				//setTimeout(remove, 1000);
				remove();
			}

			function remove(err) {
				systemPoolSockets = systemPoolSockets.filter(s => s !== c);
				if (err && (
						err.code === 'ECONNREFUSED' ||
						err.code === 'EPIPE' ||
						err.code === 'ECONNRESET'))
					setTimeout(connectPool, 5 * 1000); // 5 sec
				else
					setTimeout(connectPool, 1000); // 1 sec
			}

		}

	}); // configs.forEach

}();
