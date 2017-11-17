const request = require('request');
const fs = require('fs');
const each = require('lodash.foreach');
const constants = require('constants');
const xml2json = require('xml2json');
const iconv = require('iconv-lite');

const methods = require('./methods');

const BASE_URI = 'https://w3s.webmoney.ru/asp/';

module.exports = function (config) {
	if (!config || !config.wmid || !config.keyPath || !config.password) {
		throw new Error('bad config passed');
	}
	fs.accessSync(config.keyPath);

	let builtMethods = {};
	each(methods, (method, name) => {
		let builtMethod = async params => {
			let result = await __request(`${BASE_URI}${method.uri}`, method.buildXML(params, config));
			return method.processResponse(result);
		};
		builtMethods[name] = builtMethod;
	});

	return builtMethods;

	async function __request (url, xml) {
		let options = {
			url: url,
			method: 'POST',
			rejectUnauthorized: false,
			secureOptions: constants.SSL_OP_NO_TLSv1_2,
			encoding: 'binary',
			body: xml
		};
		try {
			let response = await new Promise((resolve, reject) => {
				request(options, (err, result) => {
					if (err) {
						return reject(err);
					}
					resolve(result);
				});
			});
			if (!response || !response.body) {
				throw new Error('empty webmoney response');
			}
			let decoded = iconv.decode(Buffer.from(response.body), 'win1251');
			let data = xml2json.toJson(decoded, {object: true});
			if (!data || !data['w3s.response'] || typeof (data['w3s.response'].retval) === 'undefined') {
				throw new Error('badly formatted webmoney response');
			}
			return data;
		} catch (e) {
			throw e;
		}
	}
};
