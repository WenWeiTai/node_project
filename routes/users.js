var express = require('express');
var router = express.Router();
//引入mongodb模块
var MongoClient = require('mongodb').MongoClient;
//链接mongodb数据库地址
var url = 'mongodb://127.0.0.1:27017';


/* 用户管理页面： localhost:3000/users */
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
        //将数据通过ejs模板传递到users.ejs
        userDb : data
      })
    })
    
    //关闭数据库
    client.close();
  })
});

/* 登陆操作 localhost:3000/users/login */
router.post('/login',function(req,res){
  //1、接收前端传递过来的账号密码
  // console.log(req.body) //{ username: '温维太', password: 'asdfasdf' }
  var username = req.body.username;
  var password = req.body.password;
  //2、后端验证,以防前端知道接口直接跳过界面做登录，这个操作可以限制前端传递的数据从前端登录页面传递
  if(!username){
    res.render('./error',{
      message : '用户名不能为空',
      error : new Error('用户名不能为空')
    })
    return;
  }

  if(!password){
    res.render('./error',{
      message : '密码不能为空',
      error : new Error('密码不能为空')
    })
    return;
  }

  // 3、验证用户名，密码是否存在
  MongoClient.connect(url,{useNewUrlParser : true},function(err,client){
    if(err){
      res.render('./error',{
        message : '查询数据库失败',
        error : err
      })
      return;
    }

    var db = client.db('nodeProject');
    db.collection('user').find({
      username : username,
      password : password
    }).toArray(function(err,data){
      if(err){
        res.render('./error',{
          message : '查询失败',
          error : err
        })
      }else if(data.length <= 0){
        res.render('./error',{
          message : '登录失败',
          error : new Error('账号或密码错误')
        })
      }else {
        // console.log(data) //查到账号密码,登录成功
        
        //将昵称写到cookie,昵称作为管理员名称显示
        res.cookie('nickname',data[0].nickname,{
          maxAge : 10 * 60 * 1000
        })
        res.redirect('/');
      }
    })
    client.close();

  })

})

module.exports = router;
