//mongo command to clear all msgs: db.messages.deleteMany({ id: { $gt: 0 } })
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
                        if (msgData.length > 0 && !document.hasFocus() && localStorage.getItem("last") != 0 && localStorage.getItem("notifsOn") == "true") {
                            if (msgData.length > 1) {notifyMe(msgData.length + " new messages!");}
                            else { notifyMe(msgData[0].nickname + ": " + goog.html.SafeHtml.unwrap(sanitizer.sanitize(msgData[0].message))) }
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
                                //console.log(data[i].message);
                                var t = new Date(1970, 0, 1);
                                t.setMilliseconds(data[i].timestamp);
                                var text = " (" + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + "): " + goog.html.SafeHtml.unwrap(sanitizer.sanitize(data[i].message));
                                var oldHeight = document.getElementById("chat-div").scrollHeight;
                                $("#chat").append(`
                            <div class="row message">
                                    <span class="` + data[i].username + `">` + data[i].nickname + "</span><p>" + text + `</p>
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