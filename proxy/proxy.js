// proxy.js

void function () {
	'use strict';

	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var zlib = require('zlib');
	var log = require('log-manager').setWriter(new require('log-writer')('proxy-%s.log')).getLogger();
	var Statistics = require('../lib/statistics');
	var constants = require('../lib/constants');
	var TransformXor = require('../lib/transform-xor');
	var zz = require('../lib/zip-unzip');

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
							combine(c, s);
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
						c.destroy();
					}

				}
				else {
					// default server (passthru)
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
			log.trace('(system) disconnected. (1)');
		}

	}).listen(configs.systemPort, function listeningSystem() {
		log.info('(system) server bound. port', configs.systemPort);
	}).on('error', function (err) {
		log.error('(system) server error.', err);
		setTimeout(function () { process.exit(1); }, 500);
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
				function connectionClient(s) {

			log.trace('(client) client connected. remain', systemPoolSockets[targetName].length);

			s.startTime = Date.now();

			s.on('error', function error(err) {
				log.warn('(client) error', err);
				s.destroy();
			});
			s.on('end', function end() {
				log.trace('(client) disconnected');
				stats.countUp();
			});

			var c = systemPoolSockets[targetName].shift();
			if (!c) {
				log.debug('(client) no pool, connection wait!');
				clientPendingSockets[targetName].push(s);
				setTimeout(function () {
					clientPendingSockets[targetName] = clientPendingSockets[targetName].filter(function (c) {
						if (c === s) {
							log.warn('(client) no pool, connection rejected!');
							s.destroy();
						}
						return c !== s;
					});
				}, 3000);
				return;
			}

			c.on('end', function end() {
				log.trace('(client) system disconnected');
			});

			combine(c, s);
		}).listen(config.clientPort, function listeningClient() {
			log.info('(client) server bound. port', config.clientPort);
		}).on('error', function (err) {
			log.error('(client) server error.', err);
			setTimeout(function () { process.exit(1); }, 500);
		});

	}); // configs.forEach

	function combine(c, s) {
		var x1 = new TransformXor(constants.xor1);
		var x2 = new TransformXor(constants.xor2);
		var x3 = new TransformXor(constants.xor2);
		var x4 = new TransformXor(constants.xor1);

		c.pipe(s);
		s.pipe(c);

/*
		c.pipe(x1);
		//x1.pipe(x2);
		zz.unzip(x1, x2);
		x2.pipe(s);

		s.pipe(x3);
		//x3.pipe(x4);
		zz.zip(x3, x4);
		x4.pipe(c);
*/
	}

}();
