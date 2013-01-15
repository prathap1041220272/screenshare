var socket = undefined;
var SessionKey;
var oDOM;


if (typeof jQuery == 'undefined') {
    var jquery = document.createElement("script");
    jquery.setAttribute("type","text/javascript");
    jquery.setAttribute("src","http://code.jquery.com/jquery-1.8.3.min.js");
    jquery.onload = DetectBrowser();
    jquery.onreadystatechange = function() {
        if (this.readyState == "complete" || this.readyState == "loaded") DetectBrowser();
    };
    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(jquery);
}
else{
    DetectBrowser();
}


function DetectBrowser(){
    var isIE = /*@cc_on!@*/false;
    if(isIE){
        var ChromeTabTag = document.createElement('meta');
        ChromeTabTag.httpEquiv = "X-UA-Compatible";
        ChromeTabTag.content = "chrome=1";
        document.getElementsByTagName('head')[0].appendChild(ChromeTabTag);
        $.getScript("http://yearofthecu.com:3000/lib/js/cfinstall.js", function(){
            CFInstall.require();
            LoadScripts();
        });
    }
    else{
        LoadScripts();
    }
}


function LoadScripts(){
    $.get('lib/css/screenshare.css', function(css)
    {
        $('<style type="text/css"></style>')
            .html(css)
            .appendTo("head");
    });
    $.getScript("http://yearofthecu.com:3000/lib/js/session.js");
    $.getScript("http://yearofthecu.com:3000/lib/js/mutation_summary.js");
    $.getScript("http://yearofthecu.com:3000/lib/js/tree_mirror.js");
    $.getScript("http://yearofthecu.com:3001/socket.io/socket.io.js", function(){
        AddMenu();
        startMirroring();
        $(window).resize(function() {
            if(socket != undefined){
                socketSend({height: $(window).height(), width: $(window).width()});
            }
            $('#MenuTable').css({left: ($(window).width() - 30), top: ($(window).height()/2) - 150});
        });
    });
}

function socketSend(msg) {
    socket.emit('changeHappened', {change: msg, room: sessvars.Session});
}

function startMirroring() {
    var mirrorClient;
    mirrorClient = new TreeMirrorClient(document, {
        initialize: function(rootId, children) {
            oDOM = {
                f: 'initialize',
                args: [rootId, children]
            }
        },

        applyChanged: function(removed, addedOrMoved, attributes, text) {
            if(socket != undefined){
                socketSend({
                    f: 'applyChanged',
                    args: [removed, addedOrMoved, attributes, text]
                });
            }
        }
    });
    if(sessvars.Session){
        ContinueSession();
    }
}
function ContinueSession(){
    socket = io.connect('http://yearofthecu.com:3001');
    socket.on('connect', function(){
        socket.emit('PageChange', sessvars.Session);
        $('#RemoteStatus').text('Status: Waiting for connection.');
        socket.on('SessionStarted', function() {
            $('#RemoteStatus').text('Status: Connected!');
            socketSend({height: $(window).height(), width: $(window).width()});
            socketSend({ base: location.href.match(/^(.*\/)[^\/]*$/)[1] });
            socketSend(oDOM);
            SendMouse();
            $('body').append('<div id="AdminPointer"></div> ');
            $(window).scroll(function(){
                socketSend({scroll: $(window).scrollTop()});
            });
        });
        socket.on('AdminMousePosition', function(msg) {
            $('#AdminPointer').css({'left': msg.PositionLeft - 15, 'top': msg.PositionTop});
        });
        socket.on('DOMLoaded', function(){
            BindEverything();
        })
    });
}
function CreateSession(){
    socket = io.connect('http://yearofthecu.com:3001');
    SessionKey = document.getElementById('SessionKey').value;
    socket.on('connect', function(){
        socket.emit('CreateSession', SessionKey);
        $('#RemoteStatus').text('Status: Waiting for connection.');
        socket.on('SessionStarted', function() {
            sessvars.Session = SessionKey;
            $('#RemoteStatus').text('Status: Connected!');
            socketSend({height: $(window).height(), width: $(window).width()});
            socketSend({ base: location.href.match(/^(.*\/)[^\/]*$/)[1] });
            socketSend(oDOM);
            SendMouse();
            $('body').append('<div id="AdminPointer"></div> ');
            $(window).scroll(function(){
                socketSend({scroll: $(window).scrollTop()});
            });
        });
        socket.on('AdminMousePosition', function(msg) {
            $('#AdminPointer').css({'left': msg.PositionLeft - 15, 'top': msg.PositionTop});
        });
        socket.on('DOMLoaded', function(){
            BindEverything();
        })
    });
}

function BindEverything(){
    $(':input').each(function(){
        $(this).attr('value', this.value);
    });
    $('select').each(function(){
        var Selected = $(this).children('option:selected');
        $(this).children('option').removeAttr('selected', false);
        Selected.attr('selected', true);
        $(this).replaceWith($(this)[0].outerHTML);
    });
    $(':input').bind('keyup', function() {
        $(this).attr('value', this.value);
    });
    $('select').change(function(){
        var Selected = $(this).children('option:selected');
        $(this).children('option').removeAttr('selected', false);
        Selected.attr('selected', true);
        $(this).replaceWith($(this)[0].outerHTML);
        $('select').unbind('change');
        $('select').change(function(){
            var Selected = $(this).children('option:selected');
            $(this).children('option').removeAttr('selected', false);
            Selected.attr('selected', true);
            $(this).replaceWith($(this)[0].outerHTML);
            $('select').unbind('change');
        });
    });
}

function SendMouse(){
    document.onmousemove = function(e) {
        if(!e) e = window.event;

        if(e.pageX == null && e.clientX != null) {
            var doc = document.documentElement, body = document.body;

            e.pageX = e.clientX
                + (doc && doc.scrollLeft || body && body.scrollLeft || 0)
                - (doc.clientLeft || 0);

            e.pageY = e.clientY
                + (doc && doc.scrollTop || body && body.scrollTop || 0)
                - (doc.clientTop || 0);
        }
        socket.emit('ClientMousePosition', {room: SessionKey, PositionLeft: e.pageX, PositionTop: e.pageY - 5});
    }
}

function AddMenu(){
    $('body').append('<table id="MenuTable" cellpadding="0">' +
        '<tr>' +
        '<td><div id="SlideMenu"><p class="rotate">HELP</p></div></td>' +
        '<td id="MainMenuTD"><h3>Remote Assistance</h3>' +
        '<p id="RemoteAssistMessage">To Start a remote session, please create a key and provide it to the representative assisting you. Keys should be between 6 and 10 characters.</p>' +
        '<input id="SessionKey"><p id="RemoteStatus">Status: Disconnected</p>' +
        '<a class="btn" style="width: 70%" onclick="CreateSession();">Create Key</a>' +
        '</td>' +
        '</tr>' +
        '</table>');
    $('#MenuTable').css({left: $(window).width() - 30, top: ($(window).height()/2) - 150});
    $('#SlideMenu').mouseenter(function(){
        if($('#MenuTable').offset().left == $(window).width() -30){
            $('#MenuTable').animate({left:'-=' + ($('#MenuTable').width() - 30)},'fast');
        }
    });
    $('#MenuTable').mouseleave(function(){
        if($(this).offset().left == $(window).width() - $('#MenuTable').width()){
            $(this).animate({left:'+=' + ($('#MenuTable').width() - 30)},'fast');
        }
    });
}