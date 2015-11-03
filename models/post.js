var mongodb = require('./db');
markdown = require('markdown').markdown;
function Post(name, title, post) {
  this.name = name;
  this.title = title;
  this.post = post;
}

module.exports = Post;

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
  var date = new Date();
  //存储各种时间格式，方便以后扩展
  var time = {
      date: date,
      year : date.getFullYear(),
      month : date.getFullYear() + "-" + (date.getMonth() + 1),
      day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
      minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
      date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) 
  }
  //要存入数据库的文档
  var post = {
    name: this.name,
    time: time,
    title:this.title,
    post: this.post,
    comments: []
  };
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //将文档插入 posts 集合
      //
      //db.post.update({name: 'qq'},{$set:{comments:[1,2,4]}});
      collection.insert(post, {
        safe: true
      }, function (err) {
        mongodb.close();
        if (err) {
          return callback(err);//失败！返回 err
        }
        callback(null);//返回 err 为 null
      });
    });
  });
};

//获取一个人的所有文章（传入参数 name）或获取所有人的文章（不传入参数）
Post.getTen = function(name,page, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function(err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      var query = {};
      if (name) {
        query.name = name;
      }
      //使用 count 返回特定查询的文档书 total
      collection.count(query,function(err,total){
        //根据 query 对象查询，并跳过前（page-1）*10个结果。返回之后的10个结果
        collection.find(query,{
          skip:(page-1)*10,
          limit:10
        }).sort({
          time:-1
        }).toArray(function(err,docs){
          mongodb.close();
          if(err){
            return callback(err);
          }
          //解析 markdown 为 html
          docs.forEach(function(doc){
            doc.post = markdown.toHTML(doc.post);
          });
          callback(null,docs,total);
        });
      });
    });
  });
};
//根据用户名、发表日期及文章名精确获取一篇文章。
Post.getOne = function(name,day,title,callback){
  //打开数据库
  mongodb.open(function(err,db){
    if(err){
      return callback(err);
    }
    //读取 posts集合
    db.collection('posts',function(err,collection){
      if(err){
        mongodb.close();
        return callback(err);
      }
      //根据用户名，发表日期及文章进行查询
      collection.findOne({
        'name':name,
        "time.day":day,
        'title':title
      },function(err,doc){
        mongodb.close();
        if(err){
          return callback(err);
        }
        //解析markdowm为html
        if(doc){
          // comments 在哪呢
          // 程序没有问题， 你的数据不正确
          //////////////////////////////////////////////////////////////////////////////////////
          // comments =[{content: '##这里是评论内容', author: '作者2'},{content:'--这是另一条评论',author:'作者1'}] //
          ////////////////////////////////////////
          ///
          ///db.posts.update({name: 'qq'},{$set:{comments:[{content: '##这里是评论内容', author: '作者2'},{content:'--这是另一条评论',author:'作者1'}]}});
          /////////////////////////////////////////////////
          // 评论的 内容格式应该是这样的吧， 你刚才 都是空了， 肯定报错；我后添加的，也不行
          doc.post = markdown.toHTML(doc.post);
          if (doc.comments) {
              doc.comments.forEach(function (comment) {
              comment.content = markdown.toHTML(comment.content);
            });
          }
        }
        callback(null,doc);//返回查询的一篇文章
      });
    });
  });
};
//返回原始发表的内容（markdown 格式）
Post.edit = function(name, day, title, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //根据用户名、发表日期及文章名进行查询
      collection.findOne({
        "name": name,
        "time.day": day,
        "title": title
      }, function (err, doc) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null, doc);//返回查询的一篇文章（markdown 格式）
      });
    });
  });
};
//更新文章
Post.update = function(name, day, title, post, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //更新文章内容
      collection.update({
        "name": name,
        "time.day": day,
        "title": title
      }, {
        $set: {post: post}
      }, function (err) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  });
};
//删除文章
Post.remove = function(name, day, title, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //根据用户名、日期和标题查找并删除一篇文章
      collection.remove({
        "name": name,
        "time.day": day,
        "title": title
      }, {
        w: 1
      }, function (err) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  });
};