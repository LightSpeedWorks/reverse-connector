// proxy.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').setWriter(new require('log-writer')('proxy-%s.log')).getLogger();
	var Statistics = require('../lib/statistics');
	var constants = require('../lib/constants');

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);

	var configs = require('../lib/default-config')('local-proxy-config', 'proxy-config', '\t');
	if (configs.logLevel)
		log.setLevel(configs.logLevel);

	var systemPoolSockets = {};
	var clientPendingSockets = {};

	log.info({logLevel: configs.logLevel, systemPort: configs.systemPort,
		serverHost: configs.serverHost, serverPort: configs.serverPort});
	assert(Number(configs.systemPort), 'configs.systemPort');
	assert(Number(configs.serverPort), 'configs.serverPort');
	assert(       configs.serverHost,  'configs.serverHost');
	assert(       configs.clients,     'configs.clients');

	var myName = '(proxy)';
	var stats = new Statistics(log, myName);

	var systemNetSvr = net.createServer(
			{allowHalfOpen:true},
			function connectionSystem(c) {
		log.debug('(system) connected.');

		c.on('error', error);
		c.on('end', end);

		var using = false;
		c.on('readable', function readable() {
			var buff = c.read();
			if (!buff) return;

			if (!using) {
				var words;
				if (buff[0] === constants.method.charCodeAt(0) &&
						buff[1] === constants.method.charCodeAt(1) &&
						buff[2] === constants.method.charCodeAt(2) &&
						(words = buff.toString().split(' '), words[0]) === constants.method) {
					var targetName = words[1].split('?')[1];
					if (systemPoolSockets[targetName]) {

						var s = clientPendingSockets[targetName] && clientPendingSockets[targetName].shift();
						if (s) {
							log.info('(client) wait connection connected!', Date.now() - s.startTime, 'msec');
							c.pipe(s);
							s.pipe(c);
							remove();
							return;
						}

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

		function error(err) {
			log.warn('(system) error', err);
			c.destroy();
		}

		function end() {
			log.debug('(system) disconnected. (1)');
		}

	}).listen(configs.systemPort, function listeningSystem() {
		log.info('(system) server bound. port', configs.systemPort);
	});

	configs.clients.forEach(function (config) {
		assert(       config.targetName,  'config.targetName');
		assert(Number(config.clientPort), 'config.clientPort');
		var targetName = config.targetName;

		systemPoolSockets[targetName] = [];
		clientPendingSockets[targetName] = [];

		log.info(config);

		var clientNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionClient(c) {

			log.debug('(client) client connected. remain', systemPoolSockets[targetName].length);

			c.startTime = Date.now();

			c.on('error', function error(err) {
				log.warn('(client) error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug('(client) disconnected');
				stats.countUp();
			});

			var s = systemPoolSockets[targetName].shift();
			if (!s) {
				log.debug('(client) no pool, connection wait!');
				clientPendingSockets[targetName].push(c);
				setTimeout(function () {
					clientPendingSockets[targetName] = clientPendingSockets[targetName].filter(function (s) {
						if (s === c) {
							log.warn('(client) no pool, connection rejected!');
							c.destroy();
						}
						return s !== c;
					});
				}, 3000);
				return;
			}

			s.on('end', function end() {
				log.debug('(client) system disconnected');
			});
			c.pipe(s);
			s.pipe(c);
		}).listen(config.clientPort, function listeningClient() {
			log.info('(client) server bound. port', config.clientPort);
		});

	}); // configs.forEach

}();
