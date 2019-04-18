//mongo command to clear all msgs: db.messages.deleteMany({ id: { $gt: 0 } })
localStorage.removeItem("name");
if (localStorage.getItem("uid") == null) {
    $(document).ready(() => {
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
        </login>`);
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
                    $("#chat").html("<p>" + data + "</p>");
                } else {
                    var socket = io();
                    socket.emit('login', { uid: data.username });
                    var loaded = [];
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
                        console.log(msgData);
                        //console.log(msgData);
                        //set localstorage last
                        //var data = JSON.parse(msgData);
                        var data = msgData;
                        //console.log(loaded);
                        //console.log(loadLast, data);
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].timestamp == loadLast) {
                                window.scrollTo(0, document.body.offsetHeight);
                            }
                            if (!loaded.includes(data[i].timestamp)) {
                                localStorage.setItem("last", data[i].timestamp);
                                loaded.push(data[i].timestamp);
                                //console.log(data[i].message);
                                var t = new Date(1970, 0, 1);
                                t.setMilliseconds(data[i].timestamp);
                                var text = data[i].nickname + " (" + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + "): " + goog.html.SafeHtml.unwrap(sanitizer.sanitize(data[i].message));
                                var oldBodyHeight = document.body.offsetHeight;
                                $("#chat").append(`
                            <div class="row">
                                <div class="col-12">
                                    <p class="` + data[i].nickname + `">` + text + `</p>
                             </div>
                            </div>`);
                                //console.log((window.innerHeight + window.scrollY), document.body.offsetHeight);
                                if ((window.innerHeight + window.scrollY) >= oldBodyHeight) {
                                    window.scrollBy(0, 1000);
                                }
                            }
                        }
                    });
                    $("#message").html(`
                <div class="col-11">
                    <input type="text" placeholder="Chat" name="message" autocomplete="off" id="messageText" style="width: 100%;">
                </div>
                <div class="col-1">
                    <input type="submit" id="messageButton" style="opacity: 0;">
                </div>
                `);
                }
            }

        })
    });
}