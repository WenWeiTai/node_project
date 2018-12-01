var express = require("express");
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

var router = express.Router();


//============================================================// 品牌管理接口

//请求数据
router.get("/brandDate", function(req,res) {
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
router.get("/brandDelete",function(req,res){
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

//添加品牌信息
router.post("/addbrand",saveTmp.single('imgFile'),function(req,res){
    console.log(req.file);
    console.log(req.body);
    var filename = 'images/' + new Date().getTime() + '_' + req.file.originalname;
    var newFileName = path.resolve(__dirname, '../public/',filename);

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

//修改品牌
router.post("/updataBrand",saveTmp.single('imgFile'),function(req,res){
    var _id = req.body._id;
    var filename = 'images/' + new Date().getTime() + '_' + req.file.originalname;
    var newFileName = path.resolve(__dirname, '../public/',filename);

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
            db.collection('brand').updateOne({_id : ObjectId(_id)},{$set : {
                    imgSrc : 'http://localhost:3000/public/' + filename,
                    model : req.body.pName,
                    brand : req.body.pBrand,
                    price : req.body.pPrice,
                    secondHand : req.body.pSecondPrice
                }}
            ,function(err){
                if(err){
                    res.json({
                        code : -1,
                        msg : '修改失败'
                    })
                }else{
                    res.json({
                        code : 1,
                        msg : '修改成功'
                    })
                }
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


module.exports = router;