var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
//引入排除登录验证的模块
var ignoreHtml = require('./routes/ignoreHtml.js');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//自定义中间件，实现用户是否登录，有登录可以进入后台，没登录跳转到登录页
app.use(function(req,res,next){
  // console.log(req.cookies);
  // console.log(req.url)
  //存在排除的路径就跳过，不往下判断cookie
  if(ignoreHtml.indexOf(req.url) > -1){
    next()
    return;
  }

  var nickName = req.cookies.nickname;
  //如果昵称存在
  if(nickName){
    next()
  }else{
    res.redirect('/login.html'); //不做登录和注册的跳转处理，会一致循环在重定向里边，因为每次都会进来这个中间件，没有cookie，就会执行这一步，一直循环到浏览器'localhost 将您重定向的次数过多。所以在判断cookie之前，需要先排除不是登录和注册的url访问'
  }
})

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
