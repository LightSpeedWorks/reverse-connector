// rdp-spork.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();
	var startStatistics = require('../lib/start-statistics');

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);

	var configs = require('../lib/default-config')('local-rdp-spork-config', 'rdp-spork-config', '\t');
	log.setLevel(configs.logLevel);

	var forwarderId = 20000;
	var myName = '(rdp-spork)';
	var countUp = startStatistics(log, myName).countUp;

	assert(       configs.rdpHost,  'configs.rdpHost');
	assert(Number(configs.rdpPort), 'configs.rdpPort');

	configs.forwarders.forEach(function (config) {
		assert(       config.forwarderHost,  'config.forwarderHost');
		assert(Number(config.forwarderPort), 'config.forwarderPort');
		assert(Number(config.servicePort),   'config.servicePort');

		log.info(config);

		var serviceNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionService(c) {
			log.debug(myName, 'connected.');
			var s;

			c.on('error', function error(err) {
				log.warn(myName, 'client error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug(myName, 'client disconnected');
				if (!s)
					log.warn(myName, 'client has gone!');
			});
			c.on('readable', function readable() {
				var buff = c.read();
				if (!buff) return;

				if (!s) {
					console.log('b.len:', buff.length,
						'0x' + buff[0].toString(16) + ' ' +
						'0x' + buff[1].toString(16) + ' ' +
						'0x' + buff[2].toString(16) + ' ' +
						'0x' + buff[3].toString(16));

					if (buff[0] === 3 && buff[1] === 0)
						s = net.connect(
								{port:configs.rdpPort, host:configs.rdpHost, allowHalfOpen:true},
								function connectionRdp() {
							log.debug(myName, 'rdp connected');
						});
					else
						s = net.connect(
								{port:config.forwarderPort, host:config.forwarderHost, allowHalfOpen:true},
								function connectionForwarder() {
							log.debug(myName, 'forwarder connected');
						});
					s.write(buff);
					s.pipe(c);
					c.pipe(s);

					c.removeListener('readable', readable);

					s.on('error', function error(err) {
						log.warn(myName, 'forwarder error', err);
						s.destroy();
					});
					s.on('end', function end() {
						log.debug(myName, 'forwarder disconnected');
					});

				}
				else {
					s.write(buff);
				}
			});
		}).listen(config.servicePort, function listeningService() {
			log.info(myName, 'server bound. port', config.servicePort);
		});

	}); // configs.forEach

}();
