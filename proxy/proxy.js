// proxy.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();
	var startStatistics = require('../lib/start-statistics');

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);
	var configs = require('./proxy-config.json');
	log.setLevel(configs.logLevel);

	var systemPoolSockets = {};

	assert(Number(configs.systemPort), 'config.systemPort');

	var myName = '(proxy)';
	var countUp = startStatistics(log, myName).countUp;

	var systemNetSvr = net.createServer(
			{allowHalfOpen:true},
			function connectionSystem(c) {
		log.debug('(system) connected.');

		var using = false;
		c.on('readable', function readable() {
			var buff = c.read();
			if (!buff) return;

			if (!using) {
				var words;
				if (buff[0] === 0x24 &&
						(words = buff.toString().split(' '), words[0]) === '$REVERSE') {
					var targetName = words[1];
					if (systemPoolSockets[targetName]) {
						systemPoolSockets[targetName].push(c);
						log.debug('(system) connected. ' + targetName + ' remain ' +
							systemPoolSockets[targetName].length);

						c.on('error', function error(err) {
							log.warn('(system) error', err);
							c.destroy();
							remove();
						});

						c.on('end', end);

						function end() {
							log.debug('(system) disconnected.');
							remove();
						}

						function remove() {
							systemPoolSockets[targetName] = systemPoolSockets[targetName].filter(s => s !== c);
						}
					}
					else {
						log.warn('(system) targetName ' + targetName + ' not found!');
						//c.write('wrong!!!\r\n');
						c.destroy();
					}

				}
				else {
					var s = net.connect(
							{port:configs.serverPort, host:configs.serverHost, allowHalfOpen:true},
							function connectionServer() {
						s.write(buff);
						c.pipe(s);
						s.pipe(c);
					});

					s.on('error', function error(err) {
						log.warn('(server) error', err);
						s.destroy(); // end?
						c.destroy(); // end?
					});
				} // if REVERSE

				c.removeListener('readable', readable);
				using = true;
			}
		});

		c.on('error', function error(err) {
			log.warn('(system) error', err);
			c.destroy();
			//remove();
		});

		c.on('end', end);

		function end() {
			log.debug('(system) disconnected. (1)');
		}

	}).listen(configs.systemPort, function() {
		// listening listener
		log.info('(system) server bound. port', configs.systemPort);
	});

	configs.clients.forEach(function (config) {
		assert(       config.targetName,  'config.targetName');
		assert(Number(config.clientPort), 'config.clientPort');

		systemPoolSockets[config.targetName] = [];

		log.info(config);

		var clientNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionClient(c) {
			var s, a = systemPoolSockets[config.targetName];
			if (!a || !(a instanceof Array) || !(s = a.shift())) {
				log.warn('(client) no pool, connection rejected!');
				return c.destroy();
			}

			// connection listener
			log.debug('(client) client connected. remain', systemPoolSockets[config.targetName].length);
			c.on('error', function (err) {
				log.warn('(client) error', err);
				c.destroy();
			});
			c.on('end', function() {
				log.debug('(client) disconnected');
				countUp();
			});
			s.on('end', function() {
				log.debug('(client) system disconnected');
			});
			c.pipe(s);
			s.pipe(c);
		}).listen(config.clientPort, function listeningClient() {
			log.info('(client) server bound. port', config.clientPort);
		});

	}); // configs.forEach

}();
