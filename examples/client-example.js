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

		log.info(config);

		var clientPoolSockets = [];

		while (clientPoolSockets.length < config.clientPool)
			connectPool();

		function connectPool() {
			if (clientPoolSockets.length >= config.clientPool)
				return;

			var a = Math.floor(Math.random() * 9) + 1;
			var b = Math.floor(Math.random() * 9) + 1;
			var connected = false;
			var returned = false;
			var disconnected = false;
			var c = net.connect(
					{port:config.clientPort, host:config.clientHost, allowHalfOpen:true},
					function connectionClient() {
				log.debug('(client) using.');
				connected = true;

				var cNo = ++clientId;
				c.write('CALC ' + cNo + ' ' + a + '+' + b + '\r\n');
				log.trace('(client) write. CALC', cNo, a + '+' + b, config.clientPort);
				c.end();
				setTimeout(function () {
					if (!returned) {
						log.warn('(client) server not respond!');
						c.destroy();
						remove();
					}
				}, 3000); // must response in 3 sec
			});
			clientPoolSockets.push(c);

			c.on('readable', function readable() {
				var buff = c.read();
				if (!buff) return;
				returned = true;

				log.debug('(client) read.');
				log.trace('(client) read. ' + (a+b) + ' = ' + buff.toString().trim());
			});

			c.on('error', error);
			c.on('end', end);

			function error(err) {
				log.warn('(client) error', err);
				c.destroy();
				remove(err);
			}

			function end() {
				log.debug('(client) disconnected. remain', clientPoolSockets.length);
				if (!connected) log.warn('(client) can not connect!');
				else if (!returned) log.warn('(client) server down!');
				disconnected = true;
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
					setTimeout(connectPool, 2 * 1000); // 2 sec
			}

		}

	}); // configs.forEach

}();
