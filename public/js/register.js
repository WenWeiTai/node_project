window.onload = function() {
  var obj = {
    user: $(".username"),
    pwd: $(".pwd"),
    nickname: $(".nickname"),

    reg_user: /^[\u4e00-\u9fa5]{2,4}$/,
    reg_pwd: /^[a-zA-Z]\w{5,11}$/,
    reg_nickname: /^([\u4e00-\u9fa5]|\w){2,10}$/
  };
  new RegRegister(obj);
};

class RegRegister {
  constructor(obj) {
    this.user = obj.user;
    this.pwd = obj.pwd;
    this.nickname = obj.nickname;

    this.reg_user = obj.reg_user;
    this.reg_pwd = obj.reg_pwd;
    this.reg_nickname = obj.reg_nickname;

    this.flag = false;
    this.init();
  }

  init() {
    this.regUser();
    this.regPwd();
    this.regNickname();
    this.checkSubmit();

    this.lookPwd();
  }

  regUser() {
    this.checkIpu(this.user, this.reg_user);
  }

  regPwd() {
    this.checkIpu(this.pwd, this.reg_pwd);
  }

  regNickname() {
    this.checkIpu(this.nickname, this.reg_nickname);
  }

  lookPwd(){
    var _this = this;
    $('.look').click(function(){
      var type = _this.pwd.attr('type');
      if(type == 'password'){
        _this.pwd.attr('type','text');
      }else{
        _this.pwd.attr('type','password');
      }
    })
  }


  //表单submit验证
  checkSubmit() {
    var _this = this;
    $("form").submit(function() {
      if (_this.flag) {
        return true;
      } else {
        return false;
      }
    });
  }

  //文本验证方法
  checkIpu(iptName, iptReg) {
    var _this = this;
    iptName.blur(function() {
      // debugger;
      if (iptReg.test($(this).val())) {
        $(this)
          .next("p")
          .html("输入正确")
          .css({ color: "green" });
        $(this).css({ borderColor: "" });
        _this.flag = true;
      } else {
        $(this)
          .next("p")
          .html("输入有误,请重新输入")
          .css({ color: "red" });
        $(this)
          .focus()
          .css({ borderColor: "red" });
        _this.flag = false;
      }
    });
  }
}
