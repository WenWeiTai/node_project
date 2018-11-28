var express = require('express');
var router = express.Router();
//引入mongodb模块
var MongoClient = require('mongodb').MongoClient;
//引入async
var async = require('async');
//获取数据库_id
var ObjectId = require('mongodb').ObjectId;
//链接mongodb数据库地址
var url = 'mongodb://127.0.0.1:27017';


/* 用户管理页面： localhost:3000/users */
router.get('/', function(req, res, next) {
  //分页功能
  //前端发送的 第几页 页条数   localhost:3000/users/?page=2&pageSize=3
  //后端查询的 总页数 总条数
  /* 
  
  页条数：pageSize  3   url
  总条数：totalSize 10  db.user.find()
  总页数: totalPage 4   Math.ceil(totalSize / pageSize) 
  第几页：page     
    1   limit(3).skip(0)  ----> page * pageSize - pageSize
    2   limit(3).skip(3)  ----> page * pageSize - pageSize
    3   limit(3).skip(6)  ----> page * pageSize - pageSize
  
  */
//  需要查前端传递的第几页和查总条数 两个异步操作，用async
// localhost:3000/users/?page=2&pageSize=3
  var page = Number(req.query.page) || 1;
  var pageSize = Number(req.query.pageSize) || 3;
  var totalSize = 0;

  MongoClient.connect(url, {useNewUrlParser : true}, function(err,client){
    if(err){
      res.render('error',{
        message : '连接数据库失败',
        error : err
      })
      return
    }

    var db = client.db('nodeProject');
    async.series([
      //查询总条数
      function (cb) {
        db.collection('user').find().count(function(err,num){
          if(err){
            cb(err);
          }else{
            totalSize = num;
            cb(null);
          }
        })
      },

      function (cb) {
        //根据前端请求查询对应数据
        db.collection('user').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err,data){
          if(err){
            cb(err)
          }else{
            //拿到数据
            cb(null,data)
          }
        });

      }

    ],function(err,result){
      if(err){
        res.render('error',{
          message : '出错',
          error : err
        })
        return;
      }

      var totalPage = Math.ceil(totalSize / pageSize)
      res.render('users',{
        userDb : result[1],
        //总页数
        totalPage : totalPage,
        //页条数
        pageSize : pageSize,
        //第几页
        page : page

      });
      client.close();
    })
  })










  /* //链接数据库----- { useNewUrlParser: true } 关闭新url版本的警告
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
  }) */
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

// 注册操作 localhost:3000/users/register
router.post('/register',function(req,res){
  var username = req.body.username;
  var password = req.body.password;
  var nickname = req.body.nickname;
  var phone = parseInt(req.body.phone);
  var age = parseInt(req.body.age);
  var sex = req.body.sex;
  var isAdmin = req.body.isAdmin === '是' ? true : false;

  //接收的数据验证，以防通过第三方工具恶意请求
  if(!username){
    res.render('error',{
      message : '账号不能为空',
      error : new Error('账号不能为空')
    })
    return;
  }
  if(!password){
    res.render('error',{
      message : '密码不能为空',
      error : new Error('密码不能为空')
    })
    return;
  }

  // console.log(username,password,nickname,phone,age,sex,isAdmin)
  //连接数据库,查询用户名是否存在
  MongoClient.connect(url,{ useNewUrlParser:true},function(err,client){
    if(err){
      res.render('error',{
        message : '连接数据库失败',
        error : err
      })
      return;
    }

    var db = client.db('nodeProject');
    //这样直接插入数据库，控制不了用户不可重复，应该先查询数据库再做插入操作，因为异步操作，直接判断再添加，添加的步骤会形成回调地狱，需要用串行无关联来操作
    /* db.collection('user').insertOne({
      username : username,
      password : password,
      nickname : nickname,
      phone : phone,
      age : age,
      sex : sex,
      isAdmin : isAdmin
    },function(err){
      if(err){
        res.render('error',{
          message : '添加数据失败',
          error : err
        })
        return;
      }
      res.redirect('/login.html');
    })
    client.close(); */

    //串行无关联
    async.series([
      // 查询数据库
      function(cb){
        db.collection('user').find({
          username : username
        }).count(function(err,num){
          if(err){
            cb(err);
          }else if(num > 0){
            //查询有条数，证明已经注册过
            cb(new Error('此用户已注册'));
          }else{
            //可以注册
            cb(null);
          }
        })
      },
      function(cb){
        // 插入数据库
        db.collection('user').insertOne({
          username : username,
          password : password,
          nickname : nickname,
          phone : phone,
          age : age,
          sex : sex,
          isAdmin : isAdmin
        },function(err){
          if(err){
            cb(err)
          }else{
            cb(null)
          }
        })
      }
    ],function(err,result){
      if(err){
        res.render('error',{
          message : '出错',
          error : err
        })
      }else{
        // console.log(result);
        res.redirect('/login.html');
      }
      //插入成功之后关闭数据库
      client.close();
    })
  })
})


// 删除数据 localhost:3000/users/delete
router.get('/delete',function(req,res){
  var id = req.query.id;
  
  MongoClient.connect(url, {useNewUrlParser : true}, function(err,client){
    if(err){
      res.render('error',{
        message : '连接数据库失败',
        error : err
      })
    }else{
      var db = client.db('nodeProject');
      db.collection('user').deleteOne({
        _id: ObjectId(id)
      }, function (err,data) {
        if (err) {
          res.render('error', {
            message: '删除失败',
            error: err
          })
        } else {
          console.log(id)
          res.redirect('/users');
        }
        client.close();
      })
    }
  })
  
})

module.exports = router;
