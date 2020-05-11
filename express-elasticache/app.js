console.log("worker ID:", process.pid);

require("dotenv-safe").config();

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var util = require("util");
var fs = require("fs");
var session = require("express-session");
var methodOverride = require("method-override");
var MemcachedStore = require("connect-memcached")(session);
var readFile = util.promisify(fs.readFile);

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

if (process.env.IS_OFFLINE) {
  var cacheNodes = null;
} else {
  readFile("/var/nodelist", "utf-8")
    .then((data) => {
      var cacheNodes = [];
      if (data) {
        var lines = data.split("\n");
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].length > 0) {
            cacheNodes.push(lines[i]);
          }
        }
      }
    })
    .catch((error) =>
      console.log(`error reading file /var/nodelist: ${error.message}`)
    );
}

if (cacheNodes) {
  console.log("Using memcached store nodes:", cacheNodes);
} else {
  console.log("Not using memcached store.");
}

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride());
var cookie_params = cacheNodes ? null : process.env.secret;
app.use(cookieParser(cookie_params));
var session_params = {
  secret: process.env.secret,
  resave: false,
  saveUninitialized: false,
  store: cacheNodes ? new MemcachedStore({ hosts: cacheNodes }) : null,
};
app.use(session(session_params));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
