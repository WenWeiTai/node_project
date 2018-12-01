//引入所有页面路由
var users = require('./nodeRoutes/usersRouter');
var phone = require('./nodeRoutes/phoneRouter');
var brand = require('./nodeRoutes/brandRouter');

//模块引入
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var async = require("async");
var MongoClient = require("mongodb").MongoClient;
var ObjectId = require('mongodb').ObjectId;
var multer = require('multer');
var url = "mongodb://127.0.0.1:27017";
var fs = require('fs');
var path = require('path');
var saveTmp = multer({
    dest : 'C:/tmp'
})

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//静态托管public资源
app.use('/public',express.static('public'));

//解决跨域
app.use(function (req, res, next) {
    res.set({ "Access-Control-Allow-Origin": "*" });
    next();
});


app.use('/users',users);
app.use('/phone',phone);
app.use('/brand',brand);


app.listen("3000");
console.log("服务器启动成功");