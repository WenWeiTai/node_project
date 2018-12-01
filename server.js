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
 
//============================================================

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


//============================================================

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

// 搜索功能
// 前端ajax请求接口 ->  http://localhost:3000/api/search
app.get("/api/search",function(req,res){
    var page = Number(req.query.page) || 1;
    var pageSize = Number(req.query.pageSize) || 5;
    var totalSize = 0;
    var nickname = req.query.nickname;
    MongoClient.connect(url, { useNewUrlParser : true }, function(err,client){
        if(err){
            res.json({
                code : -1,
                msg : '服务器连接失败'
            })
        }else{
            var db = client.db('nodeProject');
            async.series([
                //查询匹配到的总条数
                function(cb){
                    db.collection('user').find({
                        nickname : new RegExp(nickname)
                    }).count(function(err,num){
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
                    db.collection('user').find({
                        nickname : new RegExp(nickname)
                    }).limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err,data){
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
/* app.get("/api/search",function(req,res){
    var nickname = req.query.nickname;
    MongoClient.connect(url, { useNewUrlParser : true }, function(err,client){
        if(err){
            res.json({
                code : -1,
                msg : '服务器连接失败'
            })
        }else{
            var db = client.db('nodeProject');
            db.collection('user').find({
                nickname : new RegExp(nickname)
            }).toArray(function(err,result){
                if(err){
                    res.json({
                        code : -1,
                        msg : '查询失败'
                    })
                }else{
                    //模糊查询成功
                    res.json({
                        code : 1,
                        msg : '查询成功',
                        data : result
                    })
                }
                client.close();
            })
        }
    })
}) */

// 删除功能
// 前端ajax请求接口 ->  http://localhost:3000/api/delete
app.get("/api/delete",function(req,res){
    var id = req.query._id;
    MongoClient.connect(url,{ useNewUrlParser : true }, function(err,client){
        if(err){
            res.json({
                code : -1,
                msg : '服务器连接失败'
            })
        }else{
            var db = client.db('nodeProject');
            db.collection('user').deleteOne({
                _id: ObjectId(id)
            },function(err,data){
                if(err){
                    res.json({
                        code : -1,
                        msg : '删除数据失败'
                    })
                }else{
                    res.json({
                        code : 1,
                        msg : '删除成功'
                    })
                }
            })
        }
        client.close();
    })
})
/* app.get("/api/delete",function(req,res){
    var username = req.query.user;
    MongoClient.connect(url,{ useNewUrlParser : true }, function(err,client){
        if(err){
            res.json({
                code : -1,
                msg : '服务器连接失败'
            })
        }else{
            var db = client.db('nodeProject');
            db.collection('user').deleteOne({
                username : username
            },function(err,data){
                if(err){
                    res.json({
                        code : -1,
                        msg : '删除数据失败'
                    })
                }else{
                    res.json({
                        code : 1,
                        msg : '删除成功'
                    })
                }
            })
        }
        client.close();
    })
}) */

//============================================================// 手机管理接口

//请求数据
app.get("/api/phoneDate", function(req,res) {
    var page = Number(req.query.page) || 1;
    var pageSize = Number(req.query.pageSize) || 3;
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
                    db.collection('phone').find().count(function(err,num){
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
                    db.collection('phone').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err,data){
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

//删除
app.get("/api/phoneDelete",function(req,res){
    var id = req.query._id; 
    console.log(id)
    MongoClient.connect(url,{ useNewUrlParser : true }, function(err,client){
        if(err){
            res.json({
                code : -1,
                msg : '服务器连接失败'
            })
        }else{
            var db = client.db('nodeProject');
            db.collection('phone').deleteOne({
                _id: ObjectId(id)
            },function(err,data){
                if(err){
                    res.json({
                        code : -1,
                        msg : '删除数据失败'
                    })
                }else{
                    res.json({
                        code : 1,
                        msg : '删除成功'
                    })
                }
            })
        }
        client.close();
    })
})


//添加手机
app.post("/api/addPhone",saveTmp.single('imgFile'),function(req,res){
    console.log(req.file);
    console.log(req.body);
    var filename = 'images/' + new Date().getTime() + '_' + req.file.originalname;
    var newFileName = path.resolve(__dirname, './public/',filename);

    try {
        var data = fs.readFileSync(req.file.path);
        fs.writeFileSync(newFileName, data);
        fs.unlinkSync(req.file.path);
        //写入数据库
        MongoClient.connect(url,{useNewUrlParser:true},(err,client)=>{
            if(err){
                res.json({
                    code : -1,
                    msg : '连接服务器失败'
                })
            }
            var db = client.db('nodeProject');
            db.collection('phone').insertOne({
                imgSrc : 'http://localhost:3000/public/' + filename,
                model : req.body.pName,
                brand : req.body.pBrand,
                price : req.body.pPrice,
                secondHand : req.body.pSecondPrice
            },function(err){
                if(err){
                    res.json({
                        code : -1,
                        msg : '添加失败'
                    })
                }
                res.json({
                    code : 1,
                    msg : '成功'
                })
                client.close();
            })   
        })

    } catch (error) {
        res.json({
            code : -1,
            msg : error
        })
    }
})

//修改信息
/* 
 需要查询后才能修改——需要Id(未完成)
*/
app.post("/api/updataPhone",saveTmp.single('imgFile'),function(req,res){
    var filename = 'images/' + new Date().getTime() + '_' + req.file.originalname;
    var newFileName = path.resolve(__dirname, './public/',filename);

    try {
        var data = fs.readFileSync(req.file.path);
        fs.writeFileSync(newFileName, data);
        fs.unlinkSync(req.file.path);
        //写入数据库
        MongoClient.connect(url,{useNewUrlParser:true},(err,client)=>{
            if(err){
                res.json({
                    code : -1,
                    msg : '连接服务器失败'
                })
            }
            var db = client.db('nodeProject');
            db.collection('phone').updateOne({
                imgSrc : 'http://localhost:3000/public/' + filename,
                model : req.body.pName,
                brand : req.body.pBrand,
                price : req.body.pPrice,
                secondHand : req.body.pSecondPrice
            },function(err){
                if(err){
                    res.json({
                        code : -1,
                        msg : '修改失败'
                    })
                }
                res.json({
                    code : 1,
                    msg : '成功'
                })
                client.close();
            })   
        })

    } catch (error) {
        res.json({
            code : -1,
            msg : error
        })
    }
})

//============================================================// 品牌管理接口

//请求数据
app.get("/api/brandDate", function(req,res) {
    var page = Number(req.query.page) || 1;
    var pageSize = Number(req.query.pageSize) || 3;
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
                    db.collection('brand').find().count(function(err,num){
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
                    db.collection('brand').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err,data){
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

//删除
app.get("/api/brandDelete",function(req,res){
    var id = req.query._id; 
    console.log(id)
    MongoClient.connect(url,{ useNewUrlParser : true }, function(err,client){
        if(err){
            res.json({
                code : -1,
                msg : '服务器连接失败'
            })
        }else{
            var db = client.db('nodeProject');
            db.collection('brand').deleteOne({
                _id: ObjectId(id)
            },function(err,data){
                if(err){
                    res.json({
                        code : -1,
                        msg : '删除数据失败'
                    })
                }else{
                    res.json({
                        code : 1,
                        msg : '删除成功'
                    })
                }
            })
        }
        client.close();
    })
})


//添加品牌
app.post("/api/addbrand",saveTmp.single('imgFile'),function(req,res){
    console.log(req.file);
    console.log(req.body);
    var filename = 'images/' + new Date().getTime() + '_' + req.file.originalname;
    var newFileName = path.resolve(__dirname, './public/',filename);

    try {
        var data = fs.readFileSync(req.file.path);
        fs.writeFileSync(newFileName, data);
        fs.unlinkSync(req.file.path);
        //写入数据库
        MongoClient.connect(url,{useNewUrlParser:true},(err,client)=>{
            if(err){
                res.json({
                    code : -1,
                    msg : '连接服务器失败'
                })
            }
            var db = client.db('nodeProject');
            db.collection('brand').insertOne({
                imgSrc : 'http://localhost:3000/public/' + filename,
                brand : req.body.pBrand,
            },function(err){
                if(err){
                    res.json({
                        code : -1,
                        msg : '添加失败'
                    })
                }
                res.json({
                    code : 1,
                    msg : '成功'
                })
                client.close();
            })   
        })

    } catch (error) {
        res.json({
            code : -1,
            msg : error
        })
    }
})


app.listen("3000");
console.log("服务器启动成功");