var express = require("express"),
    app     = express(),
    http    = require('http').Server(app),
    io      = require('socket.io')(http),
    port    = 4567,
    redis   = require('redis'),
    client  = redis.createClient(),
    h       = require('escape-html');

var controller =
{
  counter : 0,

  assocs :  {},

  colors : ['#0000FF', '#8A2BE2', '#A52A2A', '#DEB887', '#5F9EA0', '#7FFF00', '#D2691E', '#FF7F50', '#6495ED', '#DC143C', '#00FFFF', '#00008B', '#008B8B', '#B8860B', '#A9A9A9', '#006400', '#BDB76B', '#8B008B', '#556B2F', '#FF8C00', '#9932CC', '#8B0000', '#E9967A', '#8FBC8F', '#483D8B', '#2F4F4F', '#00CED1', '#9400D3', '#FF1493', '#00BFFF', '#696969', '#1E90FF', '#B22222', '#228B22', '#FF00FF', '#FF69B4', '#CD5C5C', '#4B0082', '#FF00FF', '#800000', '#66CDAA', '#0000CD', '#BA55D3', '#9370DB', '#3CB371', '#7B68EE', '#00FA9A', '#48D1CC', '#C71585', '#191970', '#00FF7F', '#4682B4', '#D2B48C', '#008080', '#D8BFD8', '#FF6347', '#40E0D0', '#EE82EE'],

  getTimestamp : function()
  {
    return new Date().getTime();
  },

  getNextColor : function()
  {
    var _this = this,
        color = _this.colors[_this.counter];

    _this.counter++;

    if(_this.counter === _this.colors.length)
    {
      _this.counter = 0;
    }
    return color;
  },

  init : function(socket)
  {
    var _this = this;
    _this.welcome(socket);
    _this.oldMessages(socket);
  },

  welcome : function(socket)
  {
    socket.emit('message', {id : 1, color : 'red', username : 'system', message : 'Welcome!'});
  },

  oldMessages : function(socket)
  {
    // get all previous messages
    client.lrange('chatter', 0, -1, function(error, data)
    {
      var messages = [];
      data.forEach(function(obj)
      {
        obj = JSON.parse(obj);
        obj.system || messages.push(obj);
      });
      socket.emit('message', {type : 'init', messages : messages});
    });
  },

  registerUser : function(socket, data)
  {
    var _this = this;

    if(_this.assocs[data.username])
    {
      data.username = data.username + '(2)';
    }
    else
    {
      _this.assocs[data.username] = {};
    }
    socket.emit('registered', {username : data.username});
  },

  sendMessage : function(socket, data)
  {
    var _this = this,
        timestamp = _this.getTimestamp();

    data.message = h(data.message);
    data.timestamp = timestamp;
    data.id = timestamp;

    _this.assocs[data.username] || (_this.assocs[data.username] = {});

    if(!_this.assocs[data.username].color)
    {
      _this.assocs[data.username] =
      {
        color : _this.getNextColor()
      }
    }

    data.color = _this.assocs[data.username].color;
    io.sockets.emit('message', data);
    client.rpush('chatter', JSON.stringify(data));
  },

  answer : function(socket, data)
  {
    var _this = this,
        type = data.value ? 'good' : 'bad';

    data.timestamp = _this.getTimestamp();
    client.rpush(data.type, JSON.stringify(data));
    client.incr('vote:total:' + type);
  }
};

//settings
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res)
{
  res.render('layout');
});

app.get('/panel', function(req, res)
{
  res.render('panel');
});

http.listen(port, function(){
  console.log('listening on localhost:', port);
});

io.sockets.on('connection', function(socket)
{

  socket.on('init', function()
  {
    controller.init(socket);
  });

  socket.on('system', function(data)
  {
    io.sockets.emit(data.type);

    if(data.type === "wipe")
    {
      client.del('chatter');
      client.del('vote:total:bad');
      client.del('vote:total:good');
      client.del('vote');
    }
  });

  socket.on('register', function(data)
  {
    controller.registerUser(socket, data);
  });

  socket.on('send', function(data)
  {
    controller.sendMessage(socket, data);
  });

  socket.on('answer', function(data)
  {
    controller.answer(socket, data);
  });
});

client.on('error', function(e)
{
  console.log("Error: " + e);
});
