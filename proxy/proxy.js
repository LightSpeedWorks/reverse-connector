// proxy.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');

	var x = process.argv[2] || '37';
	x = '\x1b[' + x + 'm';
	var y = '\x1b[m';
	var basename = path.basename(__filename);
	console.log(basename);
	var configs = require('./proxy-config.json');

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

		console.log(x, new Date().toLocaleString(), basename, process.version, y);
		console.log(config);

		var systemPoolSockets = [];

		while (systemPoolSockets.length < configs.systemPool)
			connectPool();

		function connectPool() {
			if (systemPoolSockets.length >= configs.systemPool)
				return;

			var using = false;

			var c = net.connect(configs.systemPort, configs.systemHost, function connectionSystem() {
				console.log(x, new Date().toLocaleString(), basename,
					'(system) connected.', y);

				c.write('REVERSE ' + config.targetName + ' HTTP/1.0\r\n\r\n');

				// c.removeListers('error');
				c.on('readable', function () {
					var buff = c.read();
					if (!buff) return;

					if (!using) {
						console.log(x, new Date().toLocaleString(), basename,
							'(system) using.', y);

						remove();

						var s = net.connect(config.targetPort, config.targetHost, function connectionTarget() {
							console.log(x, new Date().toLocaleString(), basename,
								'(target) connected.', y);
							s.pipe(c);
						});
						s.on('error', error);
						s.on('end', function end() {
							console.log(x, new Date().toLocaleString(), basename,
								'(target) disconnected.', y);
							// c.end();
						});
						c.on('end', function end() {
							console.log(x, new Date().toLocaleString(), basename,
								'(system) disconnected.', y);
							s.end();
						});

						function error(err) {
							console.log(x, new Date().toLocaleString(), basename,
								'(target) error', err, y);
						}

						using = true;
					}

					if (s)
						s.write(buff);
					else {
						console.log(x, new Date().toLocaleString(), basename,
							'(system) not enough! system pool.', y);
						c.end();
					}

				});
			});
			systemPoolSockets.push(c);

			c.on('error', error);
			c.on('end', end);

			function error(err) {
				console.log(x, new Date().toLocaleString(), basename,
					'(system) error', err, y);
				remove(err);
			}

			function end() {
				console.log(x, new Date().toLocaleString(), basename,
					'(system) disconnected. remain', systemPoolSockets.length, y);
				//setTimeout(remove, 1000);
				remove();
			}

			function remove(err) {
				systemPoolSockets = systemPoolSockets.filter(s => s !== c);
				if (err && err.code === 'ECONNREFUSED')
					setTimeout(connectPool, 5 * 1000); // 5 sec
				else
					setTimeout(connectPool, 1 * 1000); // 1 sec
					//connectPool();
			}

		}

	}); // configs.forEach

}();
