const wmsigner = require('node-wmsigner');

const errors = require('./transfer-errors');

module.exports = {
	getWMIDPurses: {
		uri: 'XMLPurses.asp',
		buildXML: (wmid, config) => {
			const reqn = Date.now();
			const sign = generateSignature(config, `${wmid}${reqn}`);
			return `<w3s.request>
				<reqn>${reqn}</reqn>
				<wmid>${config.wmid}</wmid>
				<sign>${sign}</sign>
				<getpurses><wmid>${wmid}</wmid></getpurses>
			</w3s.request>`;
		},
		processResponse: response => {
			if (response['w3s.response'].retval != 0) {
				throw new Error(`webmoney api responed with error ${JSON.stringify(response)}`);
			}
			return response['w3s.response'].purses.purse;
		}
	},
	getPurseWMID: {
		uri: 'XMLFindWMPurseNew.asp',
		buildXML: (purse, config) => {
			const reqn = Date.now();
			const sign = generateSignature(config, purse);
			return `<w3s.request>
				<reqn>${reqn}</reqn>
				<wmid>${config.wmid}</wmid>
				<sign>${sign}</sign>
				<testwmpurse><purse>${purse}</purse></testwmpurse>
			</w3s.request>`;
		},
		processResponse: response => {
			if (response['w3s.response'].retval != 1) {
				throw new Error(`webmoney api responed with error ${JSON.stringify(response)}`);
			}
			return response['w3s.response'].testwmpurse.wmid['$t'];
		}
	},
	transfer: {
		uri: 'XMLTrans.asp',
		/**
			to: {
				id: distinct transaction id
				purseFrom: purse to make transfer from
				purse: purse to make transfer to
				amount: amount to transfer
				desc: transfer description
			}
		}
		*/
		buildXML: (to, config) => {
			to.amount = parseInt(to.amount);
			const reqn = `999${Date.now()}`;
			const sign = generateSignature(config, `${reqn}${to.id}${to.purseFrom}${to.purse}${to.amount}0${to.desc}0`);
			return `<w3s.request>
				<reqn>${reqn}</reqn>
				<wmid>${config.wmid}</wmid>
				<sign>${sign}</sign>
				<trans>
					<tranid>${to.id}</tranid>
					<pursesrc>${to.purseFrom}</pursesrc>
					<pursedest>${to.purse}</pursedest>
					<amount>${to.amount}</amount>
					<period>0</period>
					<pcode></pcode>
					<desc>${to.desc}</desc>
					<wminvid>0</wminvid>
					<onlyauth>1</onlyauth>
				</trans>
			</w3s.request>`;
		},
		processResponse: response => {
			if (response['w3s.response'].retval != 0) {
				throw new Error(errors[response['w3s.response'].retval] || JSON.stringify(response['w3s.response']));
			}
			return response['w3s.response'];
		}
	},
	getPurseHistory: {
		uri: 'XMLOperations.asp',
		buildXML: (data, config) => {
			const { purse, datestart, datefinish } = data;
			const reqn = Date.now();
			const sign = generateSignature(config, `${purse}${reqn}`);
			return `<w3s.request>
				<reqn>${reqn}</reqn>
				<wmid>${config.wmid}</wmid>
				<sign>${sign}</sign>
				<getoperations>
						<purse>${purse}</purse>
						<datestart>${datestart}</datestart>
						<datefinish>${datefinish}</datefinish>
				</getoperations>
			</w3s.request>`;
		},
		processResponse: response => {
			if (response['w3s.response'].retval != 0) {
				throw new Error(`webmoney api responed with error ${JSON.stringify(response)}`);
			}
			return response['w3s.response'].operations.operation;
		}
	},
	finishProtectedTransfer: {
		uri: 'XMLOperations.asp',
		buildXML: (data, config) => {
			const { id, code } = data;
			const reqn = Date.now();
			const sign = generateSignature(config, `${id}${code}${reqn}`);
			return `<w3s.request>
				<reqn>${reqn}</reqn>
				<wmid>${config.wmid}</wmid>
				<sign>${sign}</sign>
				<finishprotect>
					<wmtranid>${id}</wmtranid>
					<pcode>${code}</pcode>
				</finishprotect>
			</w3s.request>`;
		},
		processResponse: response => {
			if (response['w3s.response'].retval != 0) {
				throw new Error(`webmoney api responed with error ${JSON.stringify(response)}`);
			}
			return response['w3s.response'];
		}
	}
};

function generateSignature (config, string) {
	return wmsigner.sign(config.wmid, config.password, config.keyPath, string);
}
