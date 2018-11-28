var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//解决跨域
app.use(function(req,res,next){
    res.set({'Access-Control-Allow-Origin' : '*'});
    next();
})

//登录页
// 前端ajax请求接口 ->  http://localhost:3000/api/login
app.post('/api/login',function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    var resResult = {};
    //连接数据库
    MongoClient.connect(url,{ useNewUrlParser : true },function(err,client){
        if(err){
            resResult.code = -1;
            resResult.msg = '服务器连接失败';
            res.json(resResult);
            return;
        }
        
        var db = client.db('nodeProject');
        db.collection('user').find({
            username : username,
            password : password
        }).toArray(function(err,data){
            if(err){
                resResult.code = -1;
                resResult.msg = '查询失败';
            } else if (data.length <= 0){
                resResult.code = -1;
                resResult.msg = '用户名或密码错误'
            } else {
                //登录成功
                resResult.code = 1;
                resResult.msg = '登录成功';
                //将整条查询的数据返回
                resResult.data = data[0];
            }
            client.close();
            res.json(resResult);
        })
    })
})

app.listen('3000');
console.log('服务器启动成功');