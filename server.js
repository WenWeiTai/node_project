var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://127.0.0.1:27017";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//解决跨域
app.use(function (req, res, next) {
    res.set({ "Access-Control-Allow-Origin": "*" });
    next();
});

//登录页
// 前端ajax请求接口 ->  http://localhost:3000/api/login
app.post("/api/login", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var resResult = {};

    //防止通过第三方工具恶意登录
    if (!username) {
        resResult.code = -1;
        resResult.msg = "登录失败";
        res.json(resResult);
        return;
    }
    if (!password) {
        resResult.code = -1;
        resResult.msg = "登录失败";
        res.json(resResult);
        return;
    }

    //连接数据库
    MongoClient.connect(
        url,
        { useNewUrlParser: true },
        function (err, client) {
            if (err) {
                resResult.code = -1;
                resResult.msg = "服务器连接失败";
                res.json(resResult);
                return;
            }

            var db = client.db("nodeProject");
            db.collection("user")
                .find({
                    username: username,
                    password: password
                })
                .toArray(function (err, data) {
                    if (err) {
                        resResult.code = -1;
                        resResult.msg = "查询失败";
                    } else if (data.length <= 0) {
                        resResult.code = -1;
                        resResult.msg = "用户名或密码错误";
                    } else {
                        //登录成功
                        resResult.code = 1;
                        resResult.msg = "登录成功";
                        //将整条查询的数据返回
                        resResult.data = data[0];
                    }
                    client.close();
                    res.json(resResult);
                });
        }
    );
});

// 注册页
// 前端ajax请求接口 ->  http://localhost:3000/api/register
app.post("/api/register", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var nickname = req.body.nickname;
    var phone = parseInt(req.body.phone);
    var age = parseInt(req.body.age);
    var sex = req.body.sex;
    var isAdmin = req.body.isAdmin === "是" ? true : false;

    // console.log(username,password,nickname,phone,age,sex,isAdmin)

    //接收的数据验证，以防通过第三方工具恶意请求
    if (!username) {
        res.json({
            code: -1,
            msg: "注册失败"
        });
        return;
    }
    if (!password) {
        res.json({
            code: -1,
            msg: "注册失败"
        });
        return;
    }

    //连接数据库,查询用户名是否存在
    MongoClient.connect(
        url,
        { useNewUrlParser: true },
        function (err, client) {
            if (err) {
                res.json({
                    code : -1,
                    msg : '数据库连接失败'
                })
                return;
            }
            
            //连接成功，查询集合里的数据
            var db = client.db("nodeProject");

            //串行无关联
            // async.series(
            //     [
            //         // 查询是否存在
            //         function (cb) {
            //             db.collection("user")
            //                 .find({
            //                     username: username
            //                 })
            //                 .count(function (err, num) {
            //                     if (err) {
            //                         cb(err);
            //                     } else if (num > 0) {
            //                         //查询有条数，证明已经注册过
            //                         cb(new Error("此用户已注册"));
            //                     } else {
            //                         //可以注册
            //                         cb(null);
            //                     }
            //                 });
            //         },
            //         // 不存在则插入数据
            //         function (cb) {
            //             db.collection("user").insertOne(
            //                 {
            //                     username: username,
            //                     password: password,
            //                     nickname: nickname,
            //                     phone: phone,
            //                     age: age,
            //                     sex: sex,
            //                     isAdmin: isAdmin
            //                 },
            //                 function (err) {
            //                     if (err) {
            //                         cb(err);
            //                     } else {
            //                         cb(null);
            //                     }
            //                 }
            //             );
            //         }
            //     ],
            //     function (err, result) {
            //         if (err) {
            //             res.json ({
            //                 code : -1,
            //                 msg : err
            //             })
            //         } else {
            //             //数据插入成功返回结果
            //             res.json ({
            //                 code : 1,
            //                 msg : '注册成功'
            //             })
            //         }
            //         client.close();
            //     }
            // );
        }
    );
});

app.listen("3000");
console.log("服务器启动成功");
