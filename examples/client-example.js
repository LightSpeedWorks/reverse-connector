// client-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();

	log.info('node', process.version, path.basename(__filename));
	var configs = require('./client-config.json');
	log.setLevel(configs.logLevel);

	var clientId = 10000;

	configs.clients.forEach(function (config) {
		assert(       config.clientHost,  'config.clientHost');
		assert(Number(config.clientPort), 'config.clientPort');
		assert(Number(config.clientPool), 'config.clientPool');
		config = {clientHost:config.clientHost,
		          clientPort:config.clientPort,
		          clientPool:config.clientPool};

		log.info(config);

		var clientPoolSockets = [];

		while (clientPoolSockets.length < config.clientPool)
			connectPool();

		function connectPool() {
			if (clientPoolSockets.length >= config.clientPool)
				return;

			var c = net.connect(config.clientPort, config.clientHost, function connectionClient() {
				log.debug('(client) using.');

				var cNo = ++clientId;
				c.write('example-client-message ' + cNo + ' - 1\r\n');
				setTimeout(function () {
					c.write('example-client-message ' + cNo + ' - 2\r\n');
				}, 1000);
				setTimeout(function () {
					c.end();
					remove();
				}, 3000);

				c.on('readable', function () {
					var buff = c.read();
					if (!buff) return;

					log.debug('(client) read.');
					log.trace('(client) read. ' + buff.toString().trim());
				});
			});
			clientPoolSockets.push(c);

			c.on('error', error);
			c.on('end', end);

			function error(err) {
				log.warn('(client) error', err);
				remove(err);
			}

			function end() {
				log.debug('(client) disconnected. remain', clientPoolSockets.length);
				remove();
			}

			function remove(err) {
				clientPoolSockets = clientPoolSockets.filter(s => s !== c);
				if (err && (
						err.code === 'ECONNREFUSED' ||
						err.code === 'EPIPE' ||
						err.code === 'ECONNRESET'))
					setTimeout(connectPool, 10 * 1000); // 10 sec
				else
					setTimeout(connectPool, 1000); // 1 sec
			}

		}

	}); // configs.forEach

}();
