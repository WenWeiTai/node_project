$(".h-right > .btn").click(function(){
    $(this).hide(200).prev().html('');
    $(".btnHide").show(300);
})