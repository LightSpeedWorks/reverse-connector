// zip-unzip.js

void function () {
	'use strict';

	var zlib = require('zlib');

	function zip(req, res) {

		var pending = 0, closing = false;

		req.on('readable', function readable() {
			var chunk = req.read(0x7fff);
			if (!chunk) return;

			//console.log('zip: chunk:', chunk); //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

			++pending;

			zlib.gzip(chunk, {flush: zlib.Z_FULL_FLUSH}, callback);

			function callback(err1, res1) {
				--pending;
				if (err1) console.error('zip: err1:', err1);

				try {

					if (err1) {
						res.write(encode(0, chunk));
					} else {
						res.write(encode(1, res1));
					}

				} catch (e) {
					console.error('zip: err:', e);
				}

				if (pending === 0 && closing)
					res.end();
			}

		});

		req.on('end', function end() {
			closing = true;
			if (pending === 0)
				res.end();
		});

	}

	function encode(tag, buff) {
		process.stdout.write('\x1b[4' + (tag + 1) + 'm*\x1b[m');
		var hi = (buff.length >>> 8) & 0xff;
		var lo = buff.length & 0xff;
		return Buffer.concat([new Buffer([tag, hi, lo]), buff]);
	}

	function unzip(req, res) {
		var pending = 0, closing = false;

		req.on('readable', function readable() {
			var head = req.read(3);
			if (!head) return;

			if (head.length < 3) throw new Error('unzip: head.length < 3');

			//console.log('unzip: head:', head); //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

			var tag = head[0], len = (head[1] << 8) | head[2];

			var chunk = req.read(len);
			//console.log('unzip: chunk:', chunk); //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

			if (!chunk) throw new Error('unzip: no chunk');
			//if (!chunk)
			//	return req.unshift(head);

			if (chunk.length < len) throw new Error('unzip: chunk.length < len');

			switch (tag) {
				case 0:
					return res.write(chunk);
				case 1:
				case 2:
					++pending;
					zlib.unzip(chunk, {flush: zlib.Z_FULL_FLUSH}, function (err, result) {
						--pending;
						if (err) console.error('unzip: err:', err);

						if (err)
							throw err;

						try {
							res.write(result);
						} catch (e) {
							console.error('unzip: err:', err);
						}

						if (pending === 0 && closing)
							res.end();
					});
			}

		});

		req.on('end', function end() {
			closing = true;
			if (pending === 0)
				res.end();
		});

	}

	module.exports = {zip: zip, unzip: unzip};

}();
