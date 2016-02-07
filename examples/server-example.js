// server-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();

	log.info('node', process.version, path.basename(__filename));
	var configs = require('./server-config.json');
	log.setLevel(configs.logLevel);

	var serverId = 30000;

	configs.servers.forEach(function (config) {
		assert(Number(config.serverPort), 'config.serverPort');

		log.info(config);

		var serverNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionTarget(c) {
			log.debug('(server) connected.');
			c.on('error', function error(err) {
				log.warn('(server) error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug('(server) disconnected');
			});
			c.on('readable', function () {
				var buff = c.read();
				if (!buff) return;
				var words = buff.toString().trim().split(' ');
				log.trace('(server) read.', words.join(' '));
				c.write('RESULT-SERVER ' + words[1] + ' ' + words[2] + '=' + eval(words[2]) + '\r\n');
				c.end();
			});
			//c.write('example-server-message ' + (++serverId) + ' - Z\r\n');
			//c.pipe(c);
		}).listen(config.serverPort, function listeningServer() {
			log.debug('(server) server bound. port', config.serverPort);
		});

	}); // configs.forEach

}();
