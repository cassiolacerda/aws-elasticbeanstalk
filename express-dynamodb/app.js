var cluster = require("cluster");

if (cluster.isMaster) {
  var cpuCount = require("os").cpus().length;

  for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  cluster.on("exit", function (worker) {
    console.log("Worker " + worker.id + " died :(");
    cluster.fork();
  });
} else {
  var AWS = require("aws-sdk");
  var ddb = new AWS.DynamoDB();
  var ddbTable = process.env.STARTUP_SIGNUP_TABLE;

  var express = require("express");
  var path = require("path");
  var app = express();
  app.set("view engine", "ejs");
  app.set("views", __dirname + "/views");
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, "static")));

  app.get("/", function (req, res) {
    res.render("index", {
      theme: process.env.THEME,
      flask_debug: process.env.FLASK_DEBUG || "false",
    });
  });

  app.post("/signup", function (req, res) {
    var item = {
      email: { S: req.body.email },
      name: { S: req.body.name },
      preview: { S: req.body.previewAccess },
      theme: { S: req.body.theme },
    };

    ddb.putItem(
      {
        TableName: ddbTable,
        Item: item,
        Expected: { email: { Exists: false } },
      },
      function (err, data) {
        if (err) {
          var returnStatus = 500;
          if (err.code === "ConditionalCheckFailedException") {
            returnStatus = 409;
          }
          res.status(returnStatus).end();
          console.log("DDB Error: " + err);
        } else {
          res.status(201).end();
        }
      }
    );
  });

  var port = process.env.PORT || 3000;

  var server = app.listen(port, function () {
    console.log("Server running at http://localhost:" + port + "/");
  });
}
