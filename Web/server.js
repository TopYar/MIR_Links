const fs = require('fs');
const mysql = require("mysql2");
const app = require('express')();
const keccak512 = require('js-sha3').keccak512;

const bodyParser = require("body-parser");
const cors = require('cors');
app.use(bodyParser.json({ limit: '100mb' }));
app.use(cors());

var http = require('http').Server(app);

// Подключение конфига
var config = require('./config.js');
var dateFormat = require('dateformat');
var moment = require('moment-timezone'); 
var render = require('./render.js');

// Настройка сервера Express
const options = {
    cert: fs.readFileSync(config.cert),
    key: fs.readFileSync(config.privkey),
};

const https = require('https').Server(options, app);

//var connection = require('./db');
var connection;
handleDisconnect();

//app.set('case sensitive routing', true);

//function to get size of object
Object.prototype.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

app.use(function (error, req, res, next) {
  if (error instanceof SyntaxError) {
    res.status(400);			
	var resp = '{"error": {"code": 2, "description": "Bad json syntax"}}';
	var data = JSON.parse(resp);
	res.send(data);
	return;
  } else {
    next();
  }
});

app.get("/links", function (req, res) {
	checkToken(req.headers.authtoken, function(result) {
		if (result == 0) {
			res.status(401); 
			var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
	  
		
		if (typeof req.headers.accountnumber === 'undefined') {
			res.status(400);			
			var resp = '{"error": {"code": 2, "description": "Absence of \'accountNumber\'"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		
		const sql = `SELECT * FROM links WHERE accountNumber = ? AND status = 'active' ORDER BY \`id\` DESC`;
		const filter = [req.headers.accountnumber];
		connection.query(sql, filter, function(err, results) {
			//if(err) console.log(err);
			  if(Object.size(results) < 1) {
				  
				res.status(404); 
				var resp = '{"error": {"code": 3, "description": "Links for this \'accountNumber\' not found"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			  }
			res.status(200); 
			var links_arr = [];
			for (var i = 0; i < Object.size(results); i++) {
				links_arr.push(
					{
						"PAM" : {
							"name" : results[i].name,
							"accountNumber" : results[i].accountNumber
						},
						"linkName" : results[i].linkName,
						"linkType" : results[i].linkType,
						"message" : results[i].message,
						"specifiedSum" : results[i].specifiedSum,
						"sumLimit" : results[i].sumLimit,
						"expiryDate" : results[i].expiryDate == null ? null : dateFormat(results[i].expiryDate, 'yyyy-mm-dd HH:MM:ss') + ' GMT+00:00',
						"linkId" : results[i].linkId,
					}
				);
			}
			var resp = { links : JSON.parse(JSON.stringify(links_arr))};
			var data = JSON.stringify(resp);
			res.setHeader('content-type', 'application/json');
			res.send(data);
		});
    });
});

app.get("/balance", function (req, res) {
	checkToken(req.headers.authtoken, function(result) {
		if (result == 0) {
			res.status(401); 
			var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		
		if (typeof req.headers.accountnumber === 'undefined') {
			res.status(400);			
			var resp = '{"error": {"code": 2, "description": "Absence of \'accountNumber\'"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		
		const sql = `SELECT * FROM banks WHERE accountNumber = ? COLLATE utf8_bin`;
		const filter = [req.headers.accountnumber];
		connection.query(sql, filter, function(err, results) {
			//if(err) console.log(err);
			  if(Object.size(results) != 1) {
				  
				res.status(404); 
				var resp = '{"error": {"code": 3, "description": "This \'accountNumber\' not found"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			  }
			res.status(200); 
			var resp = {
				balance: Number(Number(results[0].deposit).toFixed(2)),
			}
			var data = JSON.stringify(resp);
			res.setHeader('content-type', 'application/json');
			res.send(data);
		});
		
		
    });
});

// Authentification for bank
app.post("/links/auth", function (req, res) {
	
	// Checking request body
	if (typeof req.body.username === 'undefined') {
		res.status(400);			
		var resp = '{"error": {"code": 2, "description": "Absence of \'username\'"}}';
		var data = JSON.parse(resp);
		res.send(data);
		
		return;
	}
	else if (typeof req.body.password  === 'undefined') {
		res.status(400);			
		var resp = '{"error": {"code": 2, "description": "Absence of \'password\'"}}';
		var data = JSON.parse(resp);
		res.send(data);
		
		return;
	}
	
	var outcome = keccak512.create();
	outcome.update(req.body.password);
	var outcome_hash = outcome.hex();
	//console.log("hash: " + outcome_hash);
	const sql = `SELECT * FROM users JOIN banks ON users.accountNumber = banks.accountNumber WHERE username = ?`;
	const filter = [req.body.username];
	connection.query(sql, filter, function(err, results) {
			//if(err) console.log(err);
			  if(Object.size(results) != 1) {
				  
				res.status(404); 
				var resp = '{"error": {"code": 3, "description": "This \'username\' not found"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			  }
			  
			 
			if (outcome_hash != results[0].password) {
				res.status(401); 
				var resp = '{"error": {"code": 4, "description": "Incorrect password"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			}
			
			res.status(200); 
			var resp = {
				accountNumber: results[0].accountNumber,
				authToken: results[0].authToken,
				name: results[0].name,
			}
			var data = JSON.stringify(resp);
			res.setHeader('content-type', 'application/json');
			res.send(data);
	});
});

// Method Send Money from Kernel to Bank 2
app.post("/links/transaction", function (req, res) {
	checkToken(req.headers.authtoken, function(result) {
		if (result == 0 && false) {
			res.status(401); 
			var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		if (typeof req.headers['x-idempotency-key'] === 'undefined') {
			res.status(449);			
			var resp = '{"error": {"code": 0, "description": "Absence of header \'x-Idempotency-Key\'"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		else {
			
			if (req.headers['x-idempotency-key'].length != 30) {
				res.status(400);			
				var resp = '{"error": {"code": 2, "description": "Parameter \'x-Idempotency-Key\' must have 30 symbols"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			}
			
			checkIdempotencyKey(req.headers['x-idempotency-key'], function (flag, responseCode = null, responseBody = null) {
				if (flag != 0) {
					res.status(responseCode);
					var data = JSON.parse(responseBody);
					res.send(data);
					return;
				}
				
					
				// Checking request body
				if (typeof req.body.ProcessingCode === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'ProcessingCode\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.MessageTypeIdentifier  === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'MessageTypeIdentifier \'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.Amount === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'Amount\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.PAN === 'undefined' || !(/^[0-9]{13-19}$/.test(req.body.PAN))) {
					res.status(400);	
					var resp = '{"error": {"code": 2, "description": "Parameter \'PAN\' must have 13-19 numbers"}}';
					if (typeof req.body.PAN === 'undefined'){
						var resp = '{"error": {"code": 2, "description": "Absence of \'PAN\'"}}';
					}
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.CardSequenceNumber === 'undefined') {
					res.status(400);
					var resp = '{"error": {"code": 2, "description": "Absence of \'CardSequenceNumber\' in block \'info\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body['Additional Data #1'] === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absense of \'Additional Data #1\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				else if (typeof req.body.Time === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'Time\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.Date === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'Date\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.TransactionId === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'TransactionId\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
			
				/*
				var text = "";
				var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
				for (var i = 0; i < 6; i++)
					text += possible.charAt(Math.floor(Math.random() * possible.length));

				// Adding in database
				const sql = `INSERT INTO links(linkId, name, accountNumber, linkType, message, specifiedSum, expiryDate, status) VALUES ?`;
				var message = (typeof req.body.info.message === 'undefined') ? null : req.body.info.message;
				var specifiedSum = (typeof req.body.info.specifiedSum === 'undefined') ? null : req.body.info.specifiedSum;
				var expiryDate = (typeof req.body.info.expiryDate === 'undefined') ? null : new Date(req.body.info.expiryDate);
				const link = [[text, req.body.info.PAM.name, req.body.info.PAM.accountNumber, req.body.info.linkType, message, specifiedSum, expiryDate, 'active']];
				connection.query(sql, [link], function(err, results) {
					if(err) console.log(err);
				});
				var resp = '{"info": {"linkId": "' + text + '"}}';
				var data = JSON.parse(resp);
				
				saveResponse(req.headers['x-idempotency-key'], 201, resp);*/
				
				res.status(200);
				res.setHeader('content-type', 'application/json');
				req.body.ProcessingCode = "0110";
				res.send(req.body);
			});
		}
    });
});


// Method SendMoney for bank
app.get("/send", function (req, res) {
	checkToken(req.headers.authtoken, function(result) {
		if (result == 0) {
			res.status(401); 
			var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
			var data = JSON.parse(resp);
			res.send(data);
			saveResponse(req.headers['x-idempotency-key'], 401, resp);
			return;
		}
		
		
		if (typeof req.headers['x-idempotency-key'] === 'undefined') {
			res.status(449);			
			var resp = '{"error": {"code": 0, "description": "Absence of header \'x-Idempotency-Key\'"}}';
			var data = JSON.parse(resp);
			res.send(data);
			saveResponse(req.headers['x-idempotency-key'], 449, resp);
			return;
		}
		else {
			
			if (req.headers['x-idempotency-key'].length != 30) {
				res.status(400);			
				var resp = '{"error": {"code": 2, "description": "Parameter \'x-Idempotency-Key\' must have 30 symbols"}}';
				var data = JSON.parse(resp);
				res.send(data);
				saveResponse(req.headers['x-idempotency-key'], 400, resp);
				return;
			}
			
			checkIdempotencyKey(req.headers['x-idempotency-key'], function (flag, responseCode = null, responseBody = null) {
				// Used idempotency-key
				if (flag != 0) {
					res.status(responseCode);
					var data = JSON.parse(responseBody);
					res.send(data);
					return;
				}
				// New idempotency-key
				if (typeof req.headers.accountnumber === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'accountNumber\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				
				if (typeof req.headers.sum === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'sum\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				
				if (typeof req.headers.linkid === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'linkId\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				
				if (typeof req.headers.sum <= 0) {
					res.status(400);			
					var resp = '{"error": {"code": 3, "description": "\'Sum\' can\'t be unpositive"}}';
					var data = JSON.parse(resp);
					res.send(data);
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				var accountDeposit;
				var receiveAccountDeposit;
				var fromBankIdentificationNumber;
				var toBankIdentificationNumber;
				var linkId = req.headers.linkid;
				
				// Checking account number
				const sql = `SELECT * FROM banks WHERE accountNumber = ? COLLATE utf8_bin`;
				const filter = [req.headers.accountnumber];
				connection.query(sql, filter, function(err, results) {
					//if(err) console.log(err);
					  if(Object.size(results) != 1) {
						  
						res.status(404); 
						var resp = '{"error": {"code": 3, "description": "This \'accountNumber\' not found"}}';
						var data = JSON.parse(resp);
						res.send(data);
						saveResponse(req.headers['x-idempotency-key'], 404, resp);
						return;
					  }
					if (results[0].deposit <= req.headers.sum) {
						res.status(400); 
						var resp = '{"error": {"code": 3, "description": "Insufficient funds for \'accountNumber\'"}}';
						var data = JSON.parse(resp);
						res.send(data);
						saveResponse(req.headers['x-idempotency-key'], 400, resp);
						return;
					}
					accountDeposit = results[0].deposit - req.headers.sum;
					fromBankIdentificationNumber = results[0].bankIdentificationNumber;
					// Checking receive account number
					const sql = `SELECT * FROM banks WHERE accountNumber = ? COLLATE utf8_bin`;
					const filter = [req.headers.receiveaccountnumber];
					connection.query(sql, filter, function(err, results) {
						if(Object.size(results) != 1) {
							  
							res.status(404); 
							var resp = '{"error": {"code": 3, "description": "This \'receiveAccountNumber\' not found"}}';
							var data = JSON.parse(resp);
							res.send(data);
							saveResponse(req.headers['x-idempotency-key'], 404, resp);
							return;
						}
						const sum = parseFloat(req.headers.sum, 10);
						receiveAccountDeposit = results[0].deposit + sum;
						toBankIdentificationNumber = results[0].bankIdentificationNumber;
						
						const sql = `UPDATE banks SET deposit = ? WHERE accountNumber = ?`;
						const filter = [accountDeposit, req.headers.accountnumber];
						connection.query(sql, filter, function(err, results) {
							
							const sql = `UPDATE banks SET deposit = ? WHERE accountNumber = ?`;
							const filter = [receiveAccountDeposit, req.headers.receiveaccountnumber];
							connection.query(sql, filter, function(err, results) {
								
								var transactionId = "";
								var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
								for (var i = 0; i < 64; i++)
									transactionId += possible.charAt(Math.floor(Math.random() * possible.length));
								
								// Add new transaction to database
								const sql = `INSERT INTO transactions(transactionId, linkId, sum, fromAccountNumber, fromBankIdentificationNumber, toAccountNumber, toBankIdentificationNumber) VALUES ?`;
								const link = [[transactionId, linkId, sum, req.headers.accountnumber, fromBankIdentificationNumber, req.headers.receiveaccountnumber, toBankIdentificationNumber]];
								connection.query(sql, [link], function(err, results) {
									if(err) console.log(err);
								});
								
								res.status(200); 
								res.setHeader('content-type', 'application/json');
								var resp = '{"info" : "success"}';
								var data = JSON.parse(resp);
								res.send(data);
								saveResponse(req.headers['x-idempotency-key'], 200, resp);
								return;
							});	
						});					
					});
				});
			});
		}
    });
});

app.get('/send/:linkId', function(req, res) {
	var values = {"linkId" : req.params.linkId};
	var content = render.view("send", values, function(data) {
		res.status(200); 
		res.send(data);
		return;
	});
});


// All transactions for specific linkId
app.get('/links/transactions/:linkId', function(req, res) {
	checkToken(req.headers.authtoken, function(result) {
		if (result == 0) {
			res.status(401); 
			var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		
		var values = {"linkId" : req.params.linkId};
		var linkId = req.params.linkId;
		const sql = `SELECT * FROM transactions JOIN banks ON transactions.fromAccountNumber = banks.accountNumber WHERE linkId = ? COLLATE utf8_bin ORDER BY transactions.id DESC`;
		const filter = [linkId];
			connection.query(sql, filter, function(err, results) {
				if(err) console.log(err);
				/*if(Object.size(results) < 1) {
					res.status(404);
					var resp = '{"error": {"code": 3, "description": "Transactions for this \'linkId\' not found"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}*/
				var resp = [];
				//transactionId, linkId, sum, fromAccountNumber, fromBankIdentificationNumber, toAccountNumber, toBankIdentificationNumber
				for (var i = 0; i < Object.size(results); i++) {
					resp.push(
						{
							"transactionId" : results[i].transactionId,
							"linkId" : results[i].linkId,
							"sum" : results[i].sum,
							"fromBankIdentificationNumber" : results[i].fromBankIdentificationNumber,
							"fromAccountNumber" : results[i].fromAccountNumber,
							"name" : results[i].name,
							"date" : dateFormat(results[i].date, 'dd.mm.yyyy HH:MM'),
						}
					);
				}
				
				var transactionObject = {
					"transactions" : resp
					
				}
				var data = JSON.stringify(transactionObject, (key, value) => {
					if (value !== null) 
						return value
				});
				res.setHeader('content-type', 'application/json');
				res.send(data);
			});
	});
});


// Last 11 transactions of specific link
app.get('/links/last_transactions/:linkId', function(req, res) {
	
		//SELECT SUM(sum) as 'raise_sum' FROM transactions JOIN banks ON transactions.fromAccountNumber = banks.accountNumber WHERE linkId = 'ahYXcP' GROUP BY linkId
		var values = {"linkId" : req.params.linkId};
		var linkId = req.params.linkId;
		const sql = `SELECT * FROM transactions JOIN banks ON transactions.fromAccountNumber = banks.accountNumber WHERE linkId = ? ORDER BY transactions.id DESC LIMIT 10 OFFSET ` + req.headers.offset;
		const filter = [linkId];
			connection.query(sql, filter, function(err, results) {
				if(err) console.log(err);
				/*if(Object.size(results) < 1) {
					res.status(404);
					var resp = '{"error": {"code": 3, "description": "Transactions for this \'linkId\' not found"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}*/
				var transactions = [];
				//transactionId, linkId, sum, fromAccountNumber, fromBankIdentificationNumber, toAccountNumber, toBankIdentificationNumber
				for (var i = 0; i < Object.size(results); i++) {
					transactions.push(
						{
							"transactionId" : results[i].transactionId.substring(0, 8),
							"linkId" : results[i].linkId,
							"sum" : results[i].sum,
							"name" : results[i].name,
							"date" : dateFormat(results[i].date, 'dd.mm.yyyy HH:MM'),
							
						}
					);
				}
				
				const sql = `SELECT SUM(sum) as 'raise_sum', COUNT(*) as 'count' FROM transactions JOIN banks ON transactions.fromAccountNumber = banks.accountNumber WHERE linkId = ? GROUP BY linkId`;
				const filter = [linkId];
				connection.query(sql, filter, function(err, results) {
					if(err) console.log(err);
					/*if(Object.size(results) < 1) {
						res.status(404);
						var resp = '{"error": {"code": 3, "description": "Transactions for this \'linkId\' not found"}}';
						var data = JSON.parse(resp);
						res.send(data);
						return;
					}*/
					var raise_sum = 0;
					var count = 0;
					if (Object.size(results) > 0) {
						raise_sum = results[0].raise_sum;
						count = results[0].count;
					}
					
					var resp = {
						"raise_sum" : raise_sum,
						"count" : count,
						"transactions" : transactions
					}
					var data = JSON.stringify(resp, (key, value) => {
						if (value !== null) 
							return value
					});
					res.setHeader('content-type', 'application/json');
					res.send(data);
				});				
			});
});


// Method GET /links/raise_info/{linkId}
app.get('/links/raise_info/:linkId', function(req, res) {
	
			const sql = `SELECT * FROM links WHERE linkId = ? COLLATE utf8_bin`;
			const filter = [req.params.linkId];
			connection.query(sql, filter, function(err, results) {
				if(err) console.log(err);
				if(Object.size(results) != 1) {
					res.status(404);
					var resp = '{"error": {"code": 3, "description": "This \'linkId\' not found"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				
				if (results[0].status == "deleted") {
					res.status(410);
					var resp = '{"error": {"code": 4, "description": "This link was deleted"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				else if (results[0].status == "expired") {
					res.status(410);
					var resp = '{"error": {"code": 4, "description": "This link was expired"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				else if (results[0].sumLimit == 0) {
					res.status(400);
					var resp = '{"error": {"code": 5, "description": "This link is not for raise purposes"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				
				// Check if link was expired
				if (results[0].expiryDate != null) {
					if(new Date() > new Date(results[0].expiryDate)) {
						updateLinkStatus(req.params.linkId, "expired");
						res.status(410);
						var resp = '{"error": {"code": 4, "description": "This link was expired"}}';
						var data = JSON.parse(resp);
						res.send(data);
						return;
					}
				}
				
				var resp = {
					"sumLimit" :  results[0].sumLimit,
					"message" : results[0].message
				};
				
				var data = JSON.stringify(resp, (key, value) => {
					if (value !== null) 
						return value
				});
				
				res.setHeader('content-type', 'application/json');
				res.send(data);
			});
});



app.get('/links/dashboard/:linkId', function(req, res) {
	checkLinkStatus(req.params.linkId, function(flag, status = null) {
	
			if (flag && status == "active") {
				
				const sql = `SELECT * FROM links WHERE linkId = ? COLLATE utf8_bin`;
				const filter = [req.params.linkId];
				connection.query(sql, filter, function(err, results) {
					if(err) console.log(err);
					if(Object.size(results) != 1) {
						res.status(404);
						var resp = '{"error": {"code": 3, "description": "This \'linkId\' not found"}}';
						var data = JSON.parse(resp);
						res.send(data);
						return;
					}
					
					if (results[0].status == "deleted") {
						res.status(410);
						var resp = '{"error": {"code": 4, "description": "This link was deleted"}}';
						var data = JSON.parse(resp);
						res.send(data);
						return;
					}
					else if (results[0].status == "expired") {
						res.status(410);
						var resp = '{"error": {"code": 4, "description": "This link was expired"}}';
						var data = JSON.parse(resp);
						res.send(data);
						return;
					}
					
					// Check if link was expired
					if (results[0].expiryDate != null) {
						if(new Date() > new Date(results[0].expiryDate)) {
							updateLinkStatus(req.params.linkId, "expired");
							res.status(410);
							var resp = '{"error": {"code": 4, "description": "This link was expired"}}';
							var data = JSON.parse(resp);
							res.send(data);
							return;
						}
					}
					var values = {
						"linkId" : req.params.linkId,
						"message" : results[0].message,
						"name" : results[0].name,
						"sumLimit" : results[0].sumLimit,
						};
					
					var content = render.view("dashboard", values, function(data) {
						res.status(200); 
						res.send(data);
						return;
					});
				});
				
				
			}
			else {
				res.status(404).sendFile('404.html', {root: "/var/www/errors" });
			}	
				
		});
});

// Method POST /links
app.post("/links", function (req, res) {
	checkToken(req.headers.authtoken, function(result) {
		if (result == 0) {
			res.status(401); 
			var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		if (typeof req.headers['x-idempotency-key'] === 'undefined') {
			res.status(449);			
			var resp = '{"error": {"code": 0, "description": "Absence of header \'x-Idempotency-Key\'"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		else {
			
			if (req.headers['x-idempotency-key'].length != 30) {
				res.status(400);			
				var resp = '{"error": {"code": 2, "description": "Parameter \'x-Idempotency-Key\' must have 30 symbols"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			}
			
			checkIdempotencyKey(req.headers['x-idempotency-key'], function (flag, responseCode = null, responseBody = null) {
				if (flag != 0) {
					res.status(responseCode);
					var data = JSON.parse(responseBody);
					res.send(data);
					return;
				}
				
					
				// Checking request body
				if (typeof req.body.info === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of block \'info\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.PAM === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of block \'PAM\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.PAM.name === 'undefined') {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Absence of \'name\' in \'PAM\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.PAM.accountNumber === 'undefined' || !(/^[0-9]{20}$/.test(req.body.info.PAM.accountNumber))) {
					res.status(400);	
					var resp = '{"error": {"code": 2, "description": "Parameter \'accountNumber\' must have 20 numbers"}}';
					if (typeof req.body.info.PAM.accountNumber === 'undefined'){
						var resp = '{"error": {"code": 2, "description": "Absence of \'accountNumber\' in PAM"}}';
					}
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.linkName === 'undefined') {
					res.status(400);
					var resp = '{"error": {"code": 2, "description": "Absence of \'linkName\' in block \'info\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
				}
				else if (typeof req.body.info.linkType === 'undefined') {
					res.status(400);
					var resp = '{"error": {"code": 2, "description": "Absence of \'linkType\' in block \'info\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.linkType !== 'undefined' && ['one-time', 'perpetual'].indexOf(req.body.info.linkType) == -1) {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Parameter \'linkType\' must be \'one-time\' or \'perpetual\'"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				else if (typeof req.body.info.message !== 'undefined' && req.body.info.message == "") {
					res.status(400);			
					var resp = '{"error": {"code": 2, "description": "Parameter \'message\' can\'t be empty"}}';
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.specifiedSum !== 'undefined' && (req.body.info.specifiedSum == "" || !(/^([0-9])+(.[0-9]{1,2})?$/.test(req.body.info.specifiedSum)))) {
					res.status(400);
					var resp = '{"error": {"code": 2, "description": "Parameter \'specifiedSum\' must be a double value with maximum two digits after dot"}}';
					if (req.body.info.specifiedSum == ""){
						var resp = '{"error": {"code": 2, "description": "Parameter \'specifiedSum\' can\'t be empty"}}';
					}
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.expiryDate !== 'undefined' && (req.body.info.expiryDate == "" || !(Date.parse(req.body.info.expiryDate)))) {
					res.status(400);
					var resp = '{"error": {"code": 2, "description": "Parameter \'expiryDate\' must be followed ISO 8601 and following format: YYYY-MM-DD hh:mm:ss GMT+xx:xx"}}';
					if (req.body.info.expiryDate == ""){
						var resp = '{"error": {"code": 2, "description": "Parameter \'expiryDate\' can\'t be empty"}}';
					}
					var data = JSON.parse(resp);
					res.send(data);
					
					saveResponse(req.headers['x-idempotency-key'], 400, resp);
					return;
				}
				else if (typeof req.body.info.sumLimit !== 'undefined') {
					if (isNaN(parseFloat(req.body.info.sumLimit))) {
						res.status(400);
						var resp = '{"error": {"code": 2, "description": "Parameter \'sumLimit\' not a number"}}';
						var data = JSON.parse(resp);
						res.send(data);
						
						saveResponse(req.headers['x-idempotency-key'], 400, resp);
						return;
					}
					if (parseFloat(req.body.info.sumLimit) <= 0) {
						res.status(400);
						var resp = '{"error": {"code": 2, "description": "Parameter \'sumLimit\' should be positive"}}';
						var data = JSON.parse(resp);
						res.send(data);
						
						saveResponse(req.headers['x-idempotency-key'], 400, resp);
						return;
					}
				}
			
			
			
			
				const sql = `SELECT * FROM banks WHERE accountNumber = ? COLLATE utf8_bin`;
				const filter = [req.body.info.PAM.accountNumber];
				connection.query(sql, filter, function(err, results) {
					//if(err) console.log(err);
					if(Object.size(results) != 1) {
						  
						res.status(404); 
						var resp = '{"error": {"code": 3, "description": "This \'accountNumber\' not found"}}';
						var data = JSON.parse(resp);
						res.send(data);
						return;
					}
					
					var name = results[0].name;
					var text = "";
					var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
					for (var i = 0; i < 6; i++)
						text += possible.charAt(Math.floor(Math.random() * possible.length));

					// Adding in database
					const sql = `INSERT INTO links(linkId, name, accountNumber, linkName, linkType, message, specifiedSum, expiryDate, status, sumLimit) VALUES ?`;
					var message = (typeof req.body.info.message === 'undefined') ? null : req.body.info.message;
					var specifiedSum = (typeof req.body.info.specifiedSum === 'undefined') ? null : req.body.info.specifiedSum;
					var expiryDate = (typeof req.body.info.expiryDate === 'undefined') ? null : new Date(req.body.info.expiryDate);
					var sumLimit = (typeof req.body.info.sumLimit === 'undefined') ? 0 : req.body.info.sumLimit;
					const link = [[text, name, req.body.info.PAM.accountNumber, req.body.info.linkName, req.body.info.linkType, message, specifiedSum, expiryDate, 'active', sumLimit]];
					connection.query(sql, [link], function(err, results) {
						if(err) console.log(err);
					});

					res.status(201); 
					res.setHeader('content-type', 'application/json');
					var resp = '{"info": {"linkId": "' + text + '"}}';
					var data = JSON.parse(resp);
					
					saveResponse(req.headers['x-idempotency-key'], 201, resp);
					res.send(data);
				});
				
			});
		}
    });
});

// Method GET /links/{linkId}
app.get('/links/:linkId', function(req, res) {
	if (typeof req.headers.authtoken === 'undefined') {
		checkLinkStatus(req.params.linkId, function(flag, status = null) {
			if (flag && status == "active") {
				var values = {"linkId" : req.params.linkId};
				var content = render.view("banks", values, function(data) {
					res.status(200); 
					res.send(data);
					return;
				});
			}
			else {
				res.status(404).sendFile('404.html', {root: "/var/www/errors" });
			}
		});
	}
	else {
		checkToken(req.headers.authtoken, function(result) {
			if (result == 0) {
				res.status(401); 
				var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			}
			const sql = `SELECT * FROM links WHERE linkId = ? COLLATE utf8_bin`;
			const filter = [req.params.linkId];
			connection.query(sql, filter, function(err, results) {
				if(err) console.log(err);
				if(Object.size(results) != 1) {
					res.status(404);
					var resp = '{"error": {"code": 3, "description": "This \'linkId\' not found"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				
				if (results[0].status == "deleted") {
					res.status(410);
					var resp = '{"error": {"code": 4, "description": "This link was deleted"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				else if (results[0].status == "expired") {
					res.status(410);
					var resp = '{"error": {"code": 4, "description": "This link was expired"}}';
					var data = JSON.parse(resp);
					res.send(data);
					return;
				}
				
				// Check if link was expired
				if (results[0].expiryDate != null) {
					if(new Date() > new Date(results[0].expiryDate)) {
						updateLinkStatus(req.params.linkId, "expired");
						res.status(410);
						var resp = '{"error": {"code": 4, "description": "This link was expired"}}';
						var data = JSON.parse(resp);
						res.send(data);
						return;
					}
				}
				var resp = {"info" : 
					{
						"PAM" : {
							"name" : results[0].name,
							"accountNumber" : results[0].accountNumber
						},
						"linkType" : results[0].linkType,
						"linkName" : results[0].linkName,
						"message" : results[0].message,
						"specifiedSum" : results[0].specifiedSum,
						"sumLimit" : results[0].sumLimit,
						"expiryDate" : results[0].expiryDate == null ? null : dateFormat(results[0].expiryDate, 'yyyy-mm-dd HH:MM:ss') + ' GMT+00:00',
						"linkId" : req.params.linkId,
					}
				};
				var data = JSON.stringify(resp, (key, value) => {
					if (value !== null) 
						return value
				});
				res.setHeader('content-type', 'application/json');
				res.send(data);
			});
			
		});
	}
});


app.delete('/links/:linkId', function(req, res) {
	checkToken(req.headers.authtoken, function(result) {
		if (result == 0) {
			res.status(401); 
			var resp = '{"error": {"code": 1, "description": "Invalid authorization token"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		
		if (typeof req.headers['x-idempotency-key'] === 'undefined') {
			res.status(449);			
			var resp = '{"error": {"code": 0, "description": "Absence of header \'x-Idempotency-Key\'"}}';
			var data = JSON.parse(resp);
			res.send(data);
			return;
		}
		else {
			if (req.headers['x-idempotency-key'].length != 30) {
				res.status(400);			
				var resp = '{"error": {"code": 2, "description": "Parameter \'x-Idempotency-Key\' must have 30 symbols"}}';
				var data = JSON.parse(resp);
				res.send(data);
				return;
			}
				
			checkIdempotencyKey(req.headers['x-idempotency-key'], function (flag, responseCode = null, responseBody = null) {
				if (flag != 0) {
					res.status(responseCode);
					var data = JSON.parse(responseBody);
					res.send(data);
					return;
				}
				
				updateLinkStatus(req.params.linkId, "deleted");
				var obj = '{"status" : "ok" }';
				var data = JSON.parse(obj);
				res.send(data);
			});
		}
	});
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
  res.status(404).sendFile('404.html', {root: "/var/www/errors" });
});

function checkToken(token, res) {
	  const sql = `SELECT * FROM banks WHERE authToken = ? COLLATE utf8_bin`;
	  const filter = [token];
	  connection.query(sql, filter, function(err, results) {
		  //if(err) console.log(err);
		  if(Object.size(results) != 1) {
			res(0);
			return;
		  }
		  res(1);
	  });
}

function saveResponse(key, code, response) {
	  // Adding in database
		const sql = `INSERT INTO idempotencyKeys(idempotencyKey, responseCode, responseBody) VALUES ?`;
		const data = [[key, code, response]];
		connection.query(sql, [data], function(err, results) {
			if(err) console.log(err);
		});
}

function checkIdempotencyKey(key, res) {
	const sql = `SELECT * FROM idempotencyKeys WHERE idempotencyKey = ? COLLATE utf8_bin`;
	const filter = [key];
	connection.query(sql, filter, function(err, results) {
		//if(err) console.log(err);
		if(Object.size(results) == 1) {
			res(1, results[0].responseCode, results[0].responseBody);
			return;
		}
		res(0);
	});
}

function updateLinkStatus(linkId, status) {
	const sql = `UPDATE links SET status=? WHERE linkId = ? COLLATE utf8_bin`;
	const filter = [status, linkId];
	connection.query(sql, filter, function(err, results) {
		if(err) console.log(err);
	});
}

function checkLinkStatus(linkId, res) {
	const sql = `SELECT status FROM links WHERE linkId = ? COLLATE utf8_bin`;
	const filter = [linkId];
	connection.query(sql, filter, function(err, results) {
		//if(err) console.log(err);
		if(Object.size(results) == 1) {
			res(1, results[0].status);
			return;
		}
		res(0);
	});
}

function handleDisconnect() {
    connection = mysql.createConnection({
	  host: config.db_server,
	  user: config.db_user,
	  database: config.db_name,
	  password: config.db_password
	});  // Recreate the connection, since the old one cannot be reused.
    connection.connect( function onConnect(err) {   // The server is either down
        if (err) {                                  // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 10000);
        }
		else {
			console.log('db connected');
		}	
    });                                             // process asynchronous requests in the meantime.
                                                    // If you're also serving http, display a 503 error.
    connection.on('error', function onError(err) {
        console.log('db error: ' + err.code);
        if (err.code == 'PROTOCOL_CONNECTION_LOST') {   // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                        // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

https.listen(8443, function () {
	console.log("Listening 8443");
});