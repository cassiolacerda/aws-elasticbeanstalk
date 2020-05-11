var express = require("express");
var router = express.Router();

router.get("/slow", function (req, res, next) {
  load(10000);
  res.render("index", { title: "Express", pid: process.pid });
});

router.get("/fast", function (req, res, next) {
  res.render("index", { title: "Express", pid: process.pid });
});

function load(time) {
  const start = Date.now();
  while (Date.now() - start < time) {}
}

module.exports = router;
