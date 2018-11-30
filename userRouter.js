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
app.get("/api/search1",function(req,res){
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


app.listen("3000");
console.log("服务器启动成功");