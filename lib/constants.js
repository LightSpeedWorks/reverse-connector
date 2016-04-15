module.exports = {
	method: 'GET',
	url: '/reverse-connector',
	version: 'HTTP/1.1',
	xor1: 0xCD,
	xor2: 0xDB,
	firstResponse: [
		'HTTP/1.1 200 OK',
		'Connection: Keep-Alive',
		'Content-Type: text/plain',
		'Content-Length: 2',
		'',
		'OK'].join('\r\n')
};
