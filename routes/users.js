var express = require('express');
var router = express.Router();
//引入mongodb模块
var MongoClient = require('mongodb').MongoClient;
//链接mongodb数据库地址
var url = 'mongodb://127.0.0.1:27017';


/* localhost:3000/users */
router.get('/', function(req, res, next) {
  //链接数据库----- { useNewUrlParser: true } 关闭新url版本的警告
  MongoClient.connect(url, { useNewUrlParser: true } ,function(err,client){
    if(err){
      // console.log('链接数据库失败',err)
      res.render('./error',{
        message : '数据库连接失败',
        error : err
      })
      return;
    }
    //变量定义数据库
    var db = client.db('nodeProject');
    //查询集合里的数据
    db.collection('user').find().toArray(function(err,data){
      if(err){
        // console.log('查询用户数据失败',err);
        res.render('./error',{
          message : '用户数据查询失败',
          error : err
        })
        return
      }

      // console.log(data);数据查询成功
      res.render('./users',{
        userDb : data
      })
    })
    
    //关闭数据库
    client.close();
  })
});

module.exports = router;
