if (localStorage.getItem("notif") == null) localStorage.setItem("notif", 0);
if (localStorage.getItem("username") == null || localStorage.getItem("username") == "undefined") localStorage.removeItem("uid");
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
            } else if (data.get("username") == "" || data.get("password") == "") {
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
                        localStorage.setItem("username", data.username);
                        localStorage.setItem("nickname", data.nickname);
                        localStorage.setItem("pfp", data.pfp);
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
            } else if (data.get("username") == "" || data.get("password") == "") {
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
                        localStorage.setItem("username", data.username);
                        localStorage.setItem("nickname", data.nickname);
                        localStorage.setItem("pfp", data.pfp);
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
    if (!Notification) { alert('Desktop notifications not available in your browser. Try Chromium.'); }
    if (Notification.permission !== "granted") { Notification.requestPermission(); }
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
                    socket.emit('login', { username: data.username, loadAll: localStorage.getItem('loadAll') });
                    if (localStorage.getItem('loadAll')) {
                        localStorage.setItem("last", 0);
                        socket.emit("getUpdate", 0);
                        localStorage.setItem('loadAll', false);
                    }
                    var loaded = [];
                    var nameColorsLoaded = [];
                    var sending = [];
                    var sent = [];
                    var userMsgId = 0;
                    var loadLast = localStorage.getItem("last");
                    var builder = new goog.html.sanitizer.HtmlSanitizer.Builder();
                    builder.onlyAllowTags(["IMG"]);
                    var sanitizer = new goog.html.sanitizer.HtmlSanitizer(builder);

                    $("#chatForm").submit((event) => {
                        event.preventDefault();
                        var sendData = { uid: localStorage.getItem("uid"), message: $("#messageText").val(), id: userMsgId }
                        if ($.trim(sendData.message) != '') socket.emit("chat message", sendData);
                        sending.push(userMsgId);
                        message = goog.html.SafeHtml.unwrap(sanitizer.sanitize(sendData.message));
                        var re = /(http:\/\/|https:\/\/)?([a-zA-Z\d\-]{1,}\.){1,}[a-zA-Z\d\-]{2,3}(\/[\w-.~!$&'()*+,;=]{0,}){0,}(\?([^\?&]{1,}=[^\?&]{1,})(&[^\?&]{1,}=[^\?&]{1,}){0,})?/;
                        if (message.includes("*") || message.includes("~~")) {
                            message = parse(message, "<strong>", "</strong>", "\\*{2}[^\\*]{0,}\\*{2}", "**");
                            message = parse(message, "<em>", "</em>", "\\*{1}[^\\*]{0,}\\*{1}", "*");
                            message = parse(message, "<s>", "</s>", "~{2}[^~]{0,}~{2}", "~~");
                        }
                        if (re.test(message)) {
                            message = urlParse(message, re);
                        }
                        $("#chat").append(`
                        <div class="row message ` + localStorage.getItem("username") + `-message">
                            <div style="width:48px">
                                <img style="height:48px;width:48px;" src="/api/userPfp?pfp=` + localStorage.getItem("pfp") + `">
                            </div>
                            &nbsp;
                            <div>
                                <span class="` + localStorage.getItem("username") + ` username">` + localStorage.getItem("nickname") + "</span>&nbsp;<span style='font-size:66.66%;color:darkgrey' id='" + localStorage.getItem("username") + userMsgId + "'>" + "Sending..." + `</span>
                                <p>` + message + `</p>
                            </div>
                        </div>`
                        );
                        $("#messageText").val("");
                        document.getElementById("chat-div").scrollTo(0, document.getElementById("chat").offsetHeight);
                        userMsgId++;
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
                                if (msgData.length > 1) { notifyMe(msgData.length + " new messages!"); }
                                else { notifyMe(msgData[0].nickname + ": " + goog.html.SafeHtml.unwrap(sanitizer.sanitize(msgData[0].message))) }
                            }
                        }
                        var data = msgData;
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].timestamp == loadLast) {
                                document.getElementById("chat-div").scrollTo(0, document.getElementById("chat").offsetHeight);
                            }
                            if (data[i].username == localStorage.getItem('username') && sending.includes(data[i].id)) {
                                var t = new Date(1970, 0, 1);
                                t.setMilliseconds(data[i].timestamp);
                                $("#" + localStorage.getItem("username") + data[i].id).text("(" + ((t.getHours() + 20) % 24) + ":" + t.getMinutes() + ":" + t.getSeconds() + ")");
                                loaded.push(data[i].timestamp)
                                localStorage.setItem("last", data[i].timestamp);
                                sent.push(sending.splice(sending.indexOf(data[i].id), 1));
                            } else if (!loaded.includes(data[i].timestamp)) {
                                sent.push(data[i].id);
                                if (data[i].username == localStorage.getItem("username") && !sending.includes(data[i].id) && !sent.includes(data[i].id)) userMsgId++;
                                localStorage.setItem("last", data[i].timestamp);
                                loaded.push(data[i].timestamp);
                                var t = new Date(1970, 0, 1);
                                t.setMilliseconds(data[i].timestamp);
                                message = goog.html.SafeHtml.unwrap(sanitizer.sanitize(data[i].message));
                                var re = /(http:\/\/|https:\/\/)?([a-zA-Z\d\-]{1,}\.){1,}[a-zA-Z\d\-]{2,3}(\/[\w-.~!$&'()*+,;=]{0,}){0,}(\?([^\?&]{1,}=[^\?&]{1,})(&[^\?&]{1,}=[^\?&]{1,}){0,})?/;
                                if (message.includes("*") || message.includes("~~")) {
                                    message = parse(message, "<strong>", "</strong>", "\\*{2}[^\\*]{0,}\\*{2}", "**");
                                    message = parse(message, "<em>", "</em>", "\\*{1}[^\\*]{0,}\\*{1}", "*");
                                    message = parse(message, "<s>", "</s>", "~{2}[^~]{0,}~{2}", "~~");
                                }
                                if (re.test(message)) {
                                    message = urlParse(message, re);
                                }
                                var oldHeight = document.getElementById("chat-div").scrollHeight;
                                $("#chat").append(`
                                <div class="row message ` + data[i].username + `-message">
                                    <div style="width:48px">
                                        <img style="height:48px;width:48px;" src="/api/userPfp?pfp=` + data[i].pfp + `">
                                    </div>
                                    &nbsp;
                                    <div>
                                        <span class="` + data[i].username + ` username">` + data[i].nickname + "</span>&nbsp;<span style='font-size:66.66%;color:darkgrey'>" + "(" + ((t.getHours() + 20) % 24) + ":" + t.getMinutes() + ":" + t.getSeconds() + ")" + `</span>
                                        <p>` + message + `</p>
                                    </div>
                                </div>`
                                );
                                if (!nameColorsLoaded.includes(data[i].username) && data[i].nameColor != null) {
                                    $("#nameColors").append("." + data[i].username + "{color: " + data[i].nameColor + "}");
                                    nameColorsLoaded.push(data[i].username);
                                }
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

function appendMessage(message) {
    if (message.timestamp == loadLast) {
        document.getElementById("chat-div").scrollTo(0, document.getElementById("chat").offsetHeight);
    }
    if (message.username == localStorage.getItem('username') && sending.includes(message.id)) {
    }



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