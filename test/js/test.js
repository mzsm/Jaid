var dbName = 'JaidTest';
var tests = [
	//初期化
    function(){
    	try{
    		var jaid = new Jaid({
    			name: dbName,
    			version: 0,
    			autoOpen: false
    		});
    		jaid.deleteDatabase(function(){
    			next();//次のテストへ
    		});
    	}catch(e){
    		next();//次のテストへ
    	}
    },
    //接続して切断するだけ
    function(){
    	var jaid = new Jaid({
    		name: dbName,
    		version: 1,
    		success: function(db){
    			jaid.close();
    			OK('test');
    			next();//次のテストへ
    		},
    		upgrade: function(db){
    			console.log('onupgrade');
    		}
    	});
    },
    //同じDBに接続。
    function(){
    	console.log('2番目');
    }
];
var next = (function(){
	var index = 0;
	return function(){
		tests[index++]();
	};
})();
var execTest = function(){
	next();
};
var setResult = function(test, result){
	var elems = document.getElementsByClassName(test);
	for(var i=0; i<elems.length; i++){
		elems[i].classList.add( result? 'success' : 'error' );
	}
};
var OK = function(test){
	setResult(test, true);
};
var NG = function(test){
	setResult(test, false);
}

window.addEventListener('DOMContentLoaded', function(){
	var ua = navigator.userAgent;
	var browserName = 'Unknown browser';
	var match;
	if( match = ua.match(/Chrome\/(\d+)/) ){
		browserName = 'Google Chrome '+match[1];
	}
	document.getElementById('browserName').innerHTML = browserName;
	document.getElementById('execute').addEventListener('click', execTest);
});