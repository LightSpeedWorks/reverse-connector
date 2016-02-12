// connector.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var LogWriter = require('log-writer');
	var LogManager = require('log-manager').setWriter(new LogWriter('connect-%s.log'));
	var log = LogManager.getLogger();
	var startStatistics = require('../lib/start-statistics');

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);

	var configs = require('../lib/default-config')('local-connector-config', 'connector-config', '\t');
	if (configs.logLevel)
		log.setLevel(configs.logLevel);

	log.info({logLevel: configs.logLevel, systemPort: configs.systemPort,
		systemHost: configs.systemHost, systemPool: configs.systemPool});
	assert(       configs.systemHost,  'configs.systemHost');
	assert(Number(configs.systemPort), 'configs.systemPort');
	assert(Number(configs.systemPool), 'configs.systemPool');

	var myName = '(connector)';
	var countUp = startStatistics(log, myName).countUp;

	configs.targets.forEach(function (config) {
		assert(       config.targetName,  'config.targetName');
		assert(       config.targetHost,  'config.targetHost');
		assert(Number(config.targetPort), 'config.targetPort');

		log.info(config);

		var systemPoolSockets = [];

		while (systemPoolSockets.length < configs.systemPool)
			connectPool();

		function connectPool() {
			if (systemPoolSockets.length >= configs.systemPool)
				return;

			var using = false;

			var c = net.connect(
					{port:configs.systemPort, host:configs.systemHost, allowHalfOpen:true},
					function connectionSystem() {
				log.debug('(system) connected.');

				c.write('$REVERSE ' + config.targetName + ' HTTP/1.0\r\n\r\n');

				// c.removeListers('error');
				c.on('readable', function readable() {
					var buff = c.read();
					if (!buff) return;

					if (!using) {
						log.debug('(system) using.');

						remove();
						c.removeListener('readable', readable);

						var s = net.connect(
								{port:config.targetPort, host:config.targetHost, allowHalfOpen:true},
								function connectionTarget() {
							log.debug('(target) connected.');
						});
						s.pipe(c);
						c.pipe(s);
						s.on('error', error);
						s.on('end', function end() {
							log.debug('(target) disconnected.');
							// c.end();
						});
						c.on('end', function end() {
							log.debug('(system) disconnected.');
							//s.end();///
							countUp();
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
				c.destroy();
				remove(err);
			}

			function end() {
				log.debug('(system) disconnected. remain', systemPoolSockets.length);
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
					connectPool();
			}

		}

	}); // configs.forEach

}();
