// connector.js

void function () {
	'use strict';

	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var zlib = require('zlib');
	var log = new (require('log-manager'))().setWriter(new require('log-writer')('connector-%s.log')).getLogger();
	var Statistics = require('../lib/statistics');
	var constants = require('../lib/constants');
	var TransformXor = require('../lib/transform-xor');
	var zz = require('../lib/zip-unzip');

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
	assert(       configs.targets,     'configs.targets');

	if (configs.idleTimeout)
		var idleTimeout = configs.idleTimeout * 1000;

	var myName = '(connector)';

	if (configs.targets.length === 0) {
		log.warn(myName, ' connector not started.');
		return;
	}

	var stats = new Statistics(log, myName);

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

			var s, initialized;
			var c = net.connect(
					{port:configs.systemPort,
					 host:configs.systemHost,
					 localAddress:configs.localAddress,
					 allowHalfOpen:true},
					function connectionSystem() {
				log.trace('(system) connected.');

				var msg = [[constants.method,
					constants.url + '?' + config.targetName,
					constants.version].join(' '),
					'Host: ' + configs.systemHost + ':' + configs.systemPort,
					'Connection: Keep-Alive',
					'', ''].join('\r\n');
				c.write(msg);

				if (idleTimeout)
					setTimeout(function () {
						if (s) return;
						log.debug('(system) idle timeout disconnecting...');
						c.destroy();
						remove();
					}, idleTimeout);

				c.on('readable', function readable() {
					var buff;
					if (!initialized) {
						buff = c.read(constants.firstResponse.length);
						if (buff.toString() === constants.firstResponse)
							return initialized = true;
						else
							return log.fatal('eh?', buff.toString());
					}
					buff = c.read();
					if (!buff) return;

					if (!s) {
						log.trace('(system) using.');

						remove();
						c.removeListener('readable', readable);

						s = net.connect(
								{port:config.targetPort,
								 host:config.targetHost,
								 localAddress:config.localAddress,
								 allowHalfOpen:true},
								function connectionTarget() {
							log.trace('(target) connected.');
						});

						var x1 = new TransformXor(constants.xor1);
						var x2 = new TransformXor(constants.xor2);
						var x3 = new TransformXor(constants.xor2);
						var x4 = new TransformXor(constants.xor1);

						//s.write(buff);
						//c.pipe(s);
						//s.pipe(c);

						x1.write(buff);

						c.pipe(x1);
						x1.pipe(x2);
						//zz.unzip(x1, x2);
						x2.pipe(s);

						s.pipe(x3);
						x3.pipe(x4);
						//zz.zip(x3, x4);
						x4.pipe(c);

						s.on('error', error);
						s.on('end', function end() {
							log.trace('(target) disconnected.');
						});
						c.on('end', function end() {
							log.trace('(system) disconnected.');
							stats.countUp();
						});

						function error(err) {
							log.warn('(target) error', err);
						}

					}

				});
			});
			systemPoolSockets.push(c);

			c.on('error', error);
			c.on('end', end);

			function error(err) {
				log.warn('(system) error', err);
				c.destroy();
				if (s) s.destroy();
				remove(err);
			}

			function end() {
				log.trace('(system) disconnected. remain', systemPoolSockets.length);
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
