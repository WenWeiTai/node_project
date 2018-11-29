var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var async = require("async");
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
            async.series(
                [
                    // 查询是否存在
                    function (cb) {
                        db.collection("user")
                            .find({
                                username: username
                            })
                            .count(function (err, num) {
                                if (err) {
                                    cb({
                                        code : -1,
                                        msg : '查询用户失败'
                                    });
                                } else if (num > 0) {
                                    //查询有条数，证明已经注册过
                                    cb({
                                        code : -1,
                                        msg : '此用户已存在'
                                    });
                                } else {
                                    //可以注册
                                    cb(null);
                                }
                            });
                    },
                    // 不存在则插入数据
                    function (cb) {
                        db.collection("user").insertOne(
                            {
                                username: username,
                                password: password,
                                nickname: nickname,
                                phone: phone,
                                age: age,
                                sex: sex,
                                isAdmin: isAdmin
                            },
                            function (err) {
                                if (err) {
                                    cb({
                                        code : -1,
                                        msg : '注册失败'
                                    });
                                } else {
                                    cb(null);
                                }
                            }
                        );
                    }
                ],
                function (err, result) {
                    if (err) {
                        res.json (err);
                    } else {
                        //数据插入成功返回结果
                        res.json ({
                            code : 1,
                            msg : '注册成功'
                        })
                    }
                    client.close();
                }
            );
        }
    );
});

// 用户管理页
// 前端ajax请求接口 ->  http://localhost:3000/api/users
app.get("/api/users", function(req,res) {
    /* 
        分页功能
            根据前端请求，每次返回请求的数据渲染
                http://localhost:3000/api/users?page=1&pageSize=5
            后台需要查询两个结果：总条数、请求的第几页
            参数：
                page : 请求的第几页(查询显示数据，关键在于skip跳过几条)
                    page1 -> limit(5).skip(0);
                    page2 -> limit(5).skip(5);
                    page3 -> limit(5).skip(10);
                    ================================所得公式 skip = page * pageSize - pageSize
                pageSize : 一页显示的条数 -> 前端传递
                totalPage : 总页数  -> Math.ceil(totalSize / pageSize)
                totalSize : 所有数据条数
    */
    var page = Number(req.query.page) || 1;
    var pageSize = Number(req.query.pageSize) || 5;
    var totalSize = 0;
    
    //(两个异步流程，用async)
    MongoClient.connect(url, { useNewUrlParser : true }, function(err,client){
        if(err){
            res.json({
                code : -1,
                msg : '数据库连接失败'
            })
        }else{
            var db = client.db('nodeProject');
            async.series([
                //查询总条数
                function(cb){
                    db.collection('user').find().count(function(err,num){
                        if(err){
                            cb({
                                code : -1,
                                msg : '查询数据失败'
                            })
                        }else{
                            //将查询的总数据条数赋值
                            totalSize = num;
                            cb(null);
                        }
                    })
                },
                //查询请求的页数数据
                function(cb){
                    db.collection('user').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err,data){
                        if(err){
                            cb({
                                code : -1,
                                msg : '请求数据失败'
                            })
                        }else{
                            //将查询的页数数据带到异步流程最终结果
                            cb(null,data)

                        }
                    })
                }
            ],function(err,result){
                if(err){
                    res.json(err)
                }else{
                    res.json({
                        code : 1,
                        data : result[1],
                        totalSize : totalSize,
                        totalPage :  Math.ceil(totalSize / pageSize),
                    })
                }
                client.close();
            })

        }
    })
})
app.listen("3000");
console.log("服务器启动成功");
