const app = require('express')();
//const app = express()
const mongoClient = require('mongodb').MongoClient;
const http = require('http').Server(app);
const io = require('socket.io')(http);
const formidable = require('formidable');
const bCrypt = require('bcrypt');
const crypto = require('crypto');
const xss = require('xss');
const favicon = require('serve-favicon');

require('google-closure-library');
goog.require("goog.html.sanitizer.HtmlSanitizer");
goog.require("goog.html.sanitizer.HtmlSanitizer.Builder");
goog.require("goog.html.SafeHtml");
app.use(favicon(__dirname + '/pages/public/favicon.ico'));


// const builder = new goog.html.sanitizer.HtmlSanitizer.Builder();
// builder.onlyAllowTags(["IMG"]);

var mongoUrl = "mongodb://localhost:27017/";
var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use("/public", express.static("pages/public"));
var userList = []
io.on('connection', (socket) => {
	console.log("A user connected!");
	socket.on('disconnect', () => {
		console.log("A user disconnected...");
	})
	socket.on('login', (userData) => {
		userList.push(userData.username);
	})
	socket.on('chat message', (data) => {
		data["timestamp"] = new Date().getTime();

		mongoClient.connect(mongoUrl, (err, db) => {
			if (err) throw err;
			var dbo = db.db("mostWanted");
			dbo.collection("chatMessages").insertOne(data);
		})
		io.emit('update');
		console.log(data);
	})
	socket.on('getUpdate', (timestamp) => {
		mongoClient.connect(mongoUrl, (err, db) => {
			if (err) throw err;
			var dbo = db.db("mostWanted");
			dbo.collection("chatMessages").find({ timestamp: { $gt: parseInt(timestamp) } }).toArray().then((result) => {
				if (result.length > 0) {
					var uidList = []
					for (var i = 0; i < result.length; i++) {
						uidList.push({ uid: result[i].uid });
					}
					uidList.filter((item, index) => { return uidList.indexOf(item) >= index; });
					dbo.collection("users").find({ $or: uidList }).toArray().then((users) => {
						var chat = Array.from(result);
						var userRef = {};
						for (var i = 0; i < users.length; i++) {
							userRef[users[i].uid] = users[i];
							// console.log(users[i].uid);
						}
						userRef = JSON.parse(JSON.stringify(userRef));
						for (var i = 0; i < chat.length; i++) {
							// io.emit("debug", [userRef, chat]);
							// console.log(userRef[chat[i].uid])
							// console.log(i, chat[i].uid);
							chat[i].nickname = userRef[chat[i].uid].nickname
						}
						io.emit("sendChatMessage", chat);
					})
				}
			});
		});
	})
	setInterval(() => {
		io.emit("update");
		io.emit("checkOnline");
		// console.log(userList);
		userList = [];
	}, 10000);
})

app.get('/', (req, res) => {
	res.sendFile(__dirname + "/pages/blankPage.html");
});
app.get('/testing', (req, res) => {
	res.sendFile(__dirname + "/pages/test.html");
});

app.get('/loadPage.js', (req, res) => {
	res.sendFile(__dirname + "/pages/public/loadPage.js");
});
app.get('/loadTest.js', (req, res) => {
	res.sendFile(__dirname + "/pages/public/loadTest.js");
});

app.get('/favicon.png', (eq, res) => {
	res.sendFile(__dirname + "/pages/public/favicon.png");
})

app.get('/closure-library/:a/:b/:c', (req, res) => {
	res.sendFile(__dirname + "/pages/public/closure-library/" + req.params.a + "/" + req.params.b + "/" + req.params.c);
});
app.get('/closure-library/:a/:b/:c/:d', (req, res) => {
	res.sendFile(__dirname + "/pages/public/closure-library/" + req.params.a + "/" + req.params.b + "/" + req.params.c + "/" + req.params.d);
});
app.get('/closure-library/:a/:b/:c/:d/:e', (req, res) => {
	res.sendFile(__dirname + "/pages/public/closure-library/" + req.params.a + "/" + req.params.b + "/" + req.params.c + "/" + req.params.d + "/" + req.params.e);
});

app.post('/api/register', (req, res) => {
	var form = new formidable.IncomingForm();
	var userData = { "admin": 0, "pfp": null };
	var pw;
	form.parse(req)
		.on('field', function (name, value) {
			userData[name] = value;
		})
		.on('end', function () {
			pw = userData.password;
			userData.username = userData.username.trim();
			userData.password = userData.password.trim();
			userData["nickname"] = userData.username;
			register(userData).then((registerOutput) => {
				if (registerOutput.status == "failed") {
					res.send(registerOutput);
				} else {
					login(userData.username, pw).then((data) => {
						console.log(data);
						res.send(data);
					})
				}
			});
		})
})

app.post('/api/login', (req, res) => {
	var form = new formidable.IncomingForm();
	var userData = {};
	var pw;
	form.parse(req)
		.on('field', function (name, value) {
			userData[name] = value;
		})
		.on('end', function () {
			pw = userData.password;
			userData.username = userData.username.trim();
			userData.password = userData.password.trim();
			// userData["nickname"] = userData.username;
			login(userData.username, pw).then((data) => {
				console.log(data);
				res.send(data);
			})
		});
})

app.post('/api/online', (req, res) => {
	mongoClient.connect(mongoUrl, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		var dbo = db.db("mostWanted");
		dbo.collection("users").findOne({ uid: req.body.uid, token: req.body.token }, (err, data) => {
			if (err) throw err;
			if (data == null) {
				res.send("Oh no! You probably messed with your local storage. Logging in hasn't been implemented yet, so you can make a new user by deleting your uid.");
			} else {
				res.send(data);
			}
		})
	})
})

// https://stackoverflow.com/questions/3410464/how-to-find-indices-of-all-occurrences-of-one-string-in-another-in-javascript
function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}

async function register(userData) {
	return new Promise((resolve, reject) => {
		if (xss(userData.username) != userData.username) {
			resolve({ status: "failed", message: "Hey! No xss :<" });
		} else if (userData.username == "" || userData.password == "") {
			resolve({ status: "failed", message: "Neither the username nor password can be blank." });
		} else {
			mongoClient.connect(mongoUrl, { useNewUrlParser: true }, function (err, db) {
				if (err) throw err;
				var dbo = db.db("mostWanted");
				userData["uid"] = crypto.randomBytes(32).toString('hex');
				bCrypt.hash(userData["password"], 10, (err, hash) => {
					if (err) throw err;
					userData["password"] = hash;
					dbo.collection("users").insertOne(userData);
					resolve("User created!");
				});
			})
		}
	})
}

async function login(username, password) {
	return new Promise((resolve, reject) => {
		mongoClient.connect(mongoUrl, { useNewUrlParser: true }, function (err, db) {
			if (err) throw err;
			var dbo = db.db("mostWanted");
			dbo.collection("users").findOne({ username: username }).then(function (json) {
				bCrypt.compare(password, json["password"], (err, result) => {
					if (err) throw err;
					if (result) {
						var token = crypto.randomBytes(32).toString('hex');
						dbo.collection("users").updateOne({ _id: json["_id"] }, { $set: { token: token } });
						resolve({ status: "success", uid: json["uid"], token: token });
					} else {
						resolve({ status: "failure", message: "Incorrect username or password" });
					}
				})
			})
		})
	});
}
// 3002 is used for development
http.listen(3002, () => console.log('App listening on port 3002!'));