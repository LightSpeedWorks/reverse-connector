// zip-unzip.js

void function () {
	'use strict';

	var zlib = require('zlib');

	function zip(req, res) {
		var que = [];

		req.on('readable', function readable() {
			var chunk = req.read(0x7fff);
			if (!chunk) return;

			void function (ctx) {
				que.push(ctx);
				zlib.gzip(chunk, {flush: zlib.Z_FULL_FLUSH}, function callback(err, result) {
					ctx.err = err;
					ctx.fin = true;
					if (err) console.error('zip: err1:', err);
					try {
						if (err || result.length >= chunk.length) ctx.buf = encode(0, chunk);
						else ctx.buf = encode(1, result);
					} catch (e) { console.error('zip: err2:', e); }
					flush(que, res);
				});
			}({fin: false, err: null, buf: null, end: false});
		}); // readable

		req.on('end', function end() {
			if (que.length === 0) res.end();
			else que.push({fin: true, err: null, buf: null, end: true});
		}); // end

	} // zip

	function encode(tag, buff) {
		process.stdout.write('\x1b[4' + (tag + 1) + 'm*\x1b[m');
		var hi = (buff.length >>> 8) & 0xff;
		var lo = buff.length & 0xff;
		return Buffer.concat([new Buffer([tag, hi, lo]), buff]);
	} // encode

	function flush(que, res) {
		while(que.length > 0 && que[0].fin) {
			var obj = que.shift();
			if (obj.end)      res.end();
			else if (obj.err) res.emit(obj.err);
			else              res.write(obj.buf);
		}
	} // flush

	function unzip(req, res) {
		var que = [];

		req.on('readable', function readable() {
			var head = req.read(3);
			if (!head) return;

			if (head.length < 3) throw new Error('unzip: head.length < 3');

			var tag = head[0], len = (head[1] << 8) | head[2];

			var chunk = req.read(len);
			if (!chunk) throw new Error('unzip: no chunk');

			if (chunk.length < len) throw new Error('unzip: chunk.length < len');

			void function (tag, chunk, ctx) {
				que.push(ctx);
				if (tag === 0) {
					ctx.fin = true;
					ctx.buf = chunk;
					flush(que, res);
				}
				else {
					zlib.unzip(chunk, {flush: zlib.Z_FULL_FLUSH}, function (err, result) {
						ctx.fin = true;
						ctx.err = err;
						ctx.buf = result;

						if (err) console.error('unzip: err:', err);
						if (err) throw err;
						flush(que, res);
					});
				}
			}(tag, chunk, {fin: true, err: null, buf: null, end: false});
		}); // readable

		req.on('end', function end() {
			if (que.length === 0) res.end();
			else que.push({fin: true, err: null, buf: null, end: true});
		}); // end

	} // unzip

	module.exports = {zip: zip, unzip: unzip};

}();
