zyy72591@163.com 15990026404

zyy72592@163.com 15990026405

var $friends = $('#friendsList').find('li');
var friends = [];
$friends.each(function(index, friend) {
    var $friend = $(friend);
    var friend = $friend.attr('targetname');
    friends.push(friend);
});