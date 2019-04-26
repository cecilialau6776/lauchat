if (localStorage.getItem("notif") == null) localStorage.setItem("notif", 0);
if (localStorage.getItem("uid") == null) {
    $(document).ready(() => {
        $("#main").prop("hidden", true);
        $("#enterName").html(`
        <form method="POST" enctype="multipart/form-data" name="register">
            <input type="text" placeholder="Username" id="username" name="username" required><br>
            <input type="password" placeholder="Password" id="password" name="password" required><br>
            <input type="submit" id="registerButton" name="submit" value="Register">
        </form>
        <div id="alert">
        </div>
        <br>
        <br>
        <form method="POST" enctype="multipart/form-data" name="login">
            <input type="text" placeholder="Username" id="loginUsername" name="username" required><br>
            <input type="password" placeholder="Password" id="loginPassword" name="password" required><br>
            <input type="submit" id="loginButton" name="submit" value="login">
        </form>
        <div id="loginAlert">
        </div>`);
        $("#registerButton").click(function (event) {
            event.preventDefault();
            var data = new FormData();
            data.append("username", $.trim($("#username").val()));
            data.append("password", $.trim($("#password").val()));
            if (data.get("username").includes(" ") || data.get("password").includes(" ")) {
                $("#alert").html(`
                <p>Invalid username/password: No spaces allowed.</p>`);
            } else if (data.get("username") == "" || data.get("passowrd") == "") {
                $("#alert").html(`
                <p>Invalid username/password: Neither can be blank.</p>`);
            } else {
                $.ajax({
                    method: 'POST',
                    url: '/api/register',
                    contentType: false,
                    processData: false,
                    data: data,
                    success: function (data) {
                        localStorage.setItem("uid", data["uid"]);
                        localStorage.setItem("token", data["token"]);
                        if (data.status == "success") {
                            window.location.href = "/";
                        } else {
                            $("#alert").html("<p>" + data.message + "</p>");
                        }
                    }
                })
            }

        });
        $("#loginButton").click(function (event) {
            event.preventDefault();
            var data = new FormData();
            data.append("username", $.trim($("#loginUsername").val()));
            data.append("password", $.trim($("#loginPassword").val()));
            console.log(data.get("username"), data.get("password"));
            if (data.get("username").includes(" ") || data.get("password").includes(" ")) {
                $("#alert").html(`
                <p>Invalid username/password: No spaces allowed.</p>`);
            } else if (data.get("username") == "" || data.get("passowrd") == "") {
                $("#loginAlert").html(`
                <p>Invalid username/password: Neither can be blank.</p>`);
            } else {
                $.ajax({
                    method: 'POST',
                    url: '/api/login',
                    contentType: false,
                    processData: false,
                    data: data,
                    success: function (data) {
                        localStorage.setItem("uid", data["uid"]);
                        localStorage.setItem("token", data["token"]);
                        if (data.status == "success") {
                            window.location.href = "/";
                        } else {
                            $("#alert").html("<p>" + data.message + "</p>");
                        }
                    }
                })
            }

        })
    })
} else {
    goog.require("goog.html.sanitizer.HtmlSanitizer");
    goog.require("goog.html.sanitizer.HtmlSanitizer.Builder");
    goog.require("goog.html.SafeHtml");
    if (!Notification) {alert('Desktop notifications not available in your browser. Try Chromium.');}
    if (Notification.permission !== "granted") {Notification.requestPermission();}
    $(document).ready(function () {
        document.getElementById("notif" + localStorage.getItem('notif')).checked = true;
        var info = { uid: localStorage.getItem("uid"), token: localStorage.getItem("token") };
        $.ajax({
            method: "POST",
            url: "/api/online",
            data: info,
            success: function (data) {
                if (data.uid == null) {
                    localStorage.removeItem("uid");
                    localStorage.removeItem("token");
                    window.location.href = "/";
                } else {
                    var socket = io();
                    socket.emit('login', { uid: data.username });
                    var loaded = [];
                    var nameColorsLoaded = [];
                    var loadLast = localStorage.getItem("last");
                    var builder = new goog.html.sanitizer.HtmlSanitizer.Builder();
                    builder.onlyAllowTags(["IMG"]);
                    var sanitizer = new goog.html.sanitizer.HtmlSanitizer(builder);
                    localStorage.setItem("last", 0);
                    socket.emit("getUpdate", 0);


                    $("#chatForm").submit((event) => {
                        event.preventDefault();
                        var sendData = { uid: localStorage.getItem("uid"), message: $("#messageText").val() }
                        if ($.trim(sendData.message) != '') socket.emit("chat message", sendData);
                        $("#messageText").val("");
                    })
                    socket.on('update', () => {
                        //console.log("updatePing");
                        socket.emit("getUpdate", localStorage.getItem("last"))
                    })
                    socket.on('debug', (data => {
                        console.log(data);
                    }))
                    socket.on('sendChatMessage', (msgData) => {
                        if (msgData.length > 0 && document.visibilityState != "visible" && localStorage.getItem("last") != 0) {
                            if (localStorage.getItem("notif") == 2) {
                                if (msgData.length > 1) {notifyMe(msgData.length + " new messages!");}
                                else { notifyMe(msgData[0].nickname + ": " + goog.html.SafeHtml.unwrap(sanitizer.sanitize(msgData[0].message))) }
                            }
                        }
                        console.log(msgData);
                        //console.log(msgData);
                        //set localstorage last
                        //var data = JSON.parse(msgData);
                        var data = msgData;
                        //console.log(loaded);
                        //console.log(loadLast, data);
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].timestamp == loadLast) {
                                document.getElementById("chat-div").scrollTo(0, document.getElementById("chat").offsetHeight);
                            }
                            if (!loaded.includes(data[i].timestamp)) {
                                localStorage.setItem("last", data[i].timestamp);
                                loaded.push(data[i].timestamp);
                                console.log(i, data[i].message);
                                var t = new Date(1970, 0, 1);
                                t.setMilliseconds(data[i].timestamp);
                                message = goog.html.SafeHtml.unwrap(sanitizer.sanitize(data[i].message));
                                var re = /(http:\/\/|https:\/\/)?([a-zA-Z\d\-]{1,}\.){1,}[a-zA-Z\d\-]{2,24}(\/[\w-.~!$&'()*+,;=]{0,}){0,}/;
                                if (message.includes("*") || message.includes("~~")) {
                                    message = parse(message, "<strong>", "</strong>", "\\*{2}[^\\*]{0,}\\*{2}", "**");
                                    message = parse(message, "<em>", "</em>", "\\*{1}[^\\*]{0,}\\*{1}", "*");
                                    message = parse(message, "<s>", "</s>", "~{2}[^~]{0,}~{2}", "~~");
                                }
                                console.log("decorationParsed");
                                if (re.test(message)) {
                                    message = urlParse(message, re);
                                    console.log(message, i);
                                }
                                console.log("after url", i);
                                //message = message.includes("*") || message.includes("~~") ? parse(parse(parse(message, "<strong>", "</strong>", /\*{2}[^\*]{0,}\*{2}/), "<em>", "</em>", /\*{1}[^\*]{0,}\*{1}/), "<s>", "</s>", /~{2}[^~]{0,}~{2}/) : message;
                                var text = " (" + ((t.getHours() + 20) % 24) + ":" + t.getMinutes() + ":" + t.getSeconds() + "): " + message;
                                var oldHeight = document.getElementById("chat-div").scrollHeight;
                                $("#chat").append(`
                            <div class="row message">
                                    <span class="` + data[i].username + ` username">` + data[i].nickname + "</span><p>" + text + `</p>
                            </div>`);
                            if (!nameColorsLoaded.includes(data[i].username) && data[i].nameColor != null) {
                                $("#nameColors").append("." + data[i].username + "{color: " + data[i].nameColor + "}");
                                nameColorsLoaded.push(data[i].username);
                            }
                            //console.log(document.getElementById("chat").scrollHeight);
                            if ((document.getElementById("chat-div").scrollTop + document.getElementById("chat-div").offsetHeight) >= oldHeight) {
                                document.getElementById("chat-div").scrollTo(0, document.getElementById("chat").offsetHeight);
                            }
                            }
                        }
                    });
                    $("#message").html(`
                        <div class="col-7">
                            <input type="text" placeholder="Chat" name="message" autocomplete="off" id="messageText" style="width: 99.7%; outline: none">
                        </div>
                            <input type="submit" id="messageButton" style="opacity: 0;position: absolute;left: -9999999px" tabindex="-1">
                    `);
                }
            }

        })
    });
}

function notifyMe(body) {
    if (Notification.permission !== "granted")
        Notification.requestPermission();
    else {
        var notification = new Notification('Lauchat', {
            icon: '/favicon.png',
            body: body
        });

        // notification.onclick = function () {
        //     window.open("http://stackoverflow.com/a/13328397/1269037");
        // };

    }

}

function openSettings() {
    $("#settings").prop("hidden", false);
    $("#main").prop("hidden", true);
    $("#bottomBar").prop("hidden", true);
}

function exitSettings() {
    $("#settings").prop("hidden", true);
    $("#main").prop("hidden", false);
    $("#bottomBar").prop("hidden", false);
}

function parse(inputString, openTag, closeTag, regexString, seperator) {
    var re = new RegExp(regexString);
    var escapeRe = new RegExp("\\\\" + regexString);
	var string = inputString;
    var decorationList = string.match(re);
    var escapeList = string.match(escapeRe);
	var toAppend = "";
    var decorationCounter = 0;
    var escapeCounter = 0;
    var outString = "";
    if (decorationList != null) {
        for (var i = 0; i < string.length; i++) {
            if (escapeList != null && string.indexOf(escapeList[escapeCounter], i) == i) {
                outString += toAppend + escapeList[escapeCounter].substr(1, escapeList[escapeCounter].length - 1);
                toAppend = "";
                i += escapeList[escapeCounter].length - 1;
                decorationCounter++;
                escapeCounter++;
            } else if (string.indexOf(decorationList[decorationCounter], i) == i) {
                outString += toAppend + openTag;
                toAppend = "";
                outString += decorationList[decorationCounter].split(seperator)[1] + closeTag;
                i += decorationList[decorationCounter].length - 1;
                decorationCounter++;
            } else if (i == string.length - 1) {
                outString += toAppend + string.charAt(i);
            } else {
                toAppend += string.charAt(i);
            }
        }
        return (outString);
    } else {
        return (inputString);
    }
}

function urlParse(inputString, re) {
    //var re = new RegExp(regexString);
	var string = inputString;
    var decorationList = string.match(re);
	var toAppend = "";
    var decorationCounter = 0;
    var outString = "";
    if (decorationList != null) {
        for (var i = 0; i < string.length; i++) {
            if (string.indexOf(decorationList[decorationCounter], i) == i) {
                console.log("url", decorationList);
                var url = !(decorationList[decorationCounter].includes("http://") || decorationList[decorationCounter].includes("https://")) ? "http://" + decorationList[decorationCounter] : decorationList[decorationCounter];
                outString += toAppend + "<a href='" + url + "'>" + decorationList[decorationCounter] + "</a>";
                toAppend = "";
                //outString += decorationList[decorationCounter] + "</a>";
                i += decorationList[decorationCounter].length - 1;
                decorationCounter++;
            } else if (i == string.length - 1) {
                outString += toAppend + string.charAt(i);
            } else {
                toAppend += string.charAt(i);
            }
        }
        return (outString);
    } else {
        return (inputString);
    }
}

const menuNames = ["userSettings", "notifSettings"]

function setMenu(name) {
    for (var i = 0; i < menuNames.length; i++) {
        $("#" + menuNames[i]).prop("hidden", true);
    }
    $("#" + name + "Settings").prop("hidden", false);
}