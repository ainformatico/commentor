(function($, io, store, document, window)
{
  window.AEI = window.AEI || {};

  AEI.socket = io.connect(window.location.protocol + '//' + window.location.host);

  MessageModel = Backbone.Model.extend(
  {
    defaults:
    {
      username : '',
      message : ''
    },
  });

  MessageView = Backbone.View.extend(
  {
    template : _.template($('#tpl-message').html()),

    tagName : 'li',

    className : 'col-md-10',

    render : function()
    {
      var _this = this,
          data  = _this.model.toJSON(),
          sameUser = data.username === store.get('username');

      data.color || (data.color = '#000'); // ensure color
      if(sameUser)
      {
        data.username = 'You';
        _this.$el.addClass('hl col-md-8 col-md-offset-4');
      }
      _this.$el.html(_this.template(data));

      return _this;
    }
  });

  MessagesCollection = Backbone.Collection.extend(
  {
    model : MessageModel,

    render : function()
    {
      var _this = this;
      _this.$el = $('<ul id="messages" class="top-line" />');

      return _this;
    }
  });

  Chatter = Backbone.View.extend(
  {
    template : _.template($('#tpl-chatter').html()),

    initialize : function()
    {
      this.listenOnSocket();
      AEI.socket.emit('init'); //load everything
    },

    events:
    {
      'submit #chatter' : 'submit'
    },

    submit : function(e)
    {
      e.preventDefault();

      var _this = this,
          input = _this.$('#message'),
          val   = input.val() || '';

      if(!_.isEmpty(val) && input)
      {
        AEI.socket.emit('send',
        {
          username : store.get('username'),
          message : val
        });
        input.val('');
      }
    },

    addOne : function(data)
    {
      var _this = this,
          view  = new MessageView({model : data}),
          msg   = view.render().$el;

      msg.hide();
      _this.$el.prepend(msg);
      msg.fadeIn();
    },

    listenOnSocket : function()
    {
      var _this = this;
      AEI.socket.on('message', function(data)
      {
        switch(data.type)
        {
          case 'init': //load previous
            _this.messages.add(data.messages);
          break;
          case 'overwrite': //overwrite user's usename
            store.set('username', data.username);
          break;
          default: //add a new message
            _this.messages.add(data);
          break;
        }
      });
    },

    render : function()
    {
      var _this = this;
      _this.$el.html(_this.template({username : store.get('username')}));
      _this.messages = new MessagesCollection();
      _this.messages.on('add', _this.addOne);
      _this.$('.messages-container').append(_this.messages.render().$el);

      return _this;
    }
  });

  Login = Backbone.View.extend(
  {
    template : _.template($('#tpl-login').html()),

    render : function()
    {
      var _this = this;

      _this.$el.html(_this.template());
      return _this;
    }
  });

  Voter = Backbone.View.extend(
  {
    template : _.template($('#tpl-voter').html()),

    render : function()
    {
      var _this = this;
      _this.$el.html(_this.template());

      return _this;
    }
  });

  Final = Backbone.View.extend(
  {
    template : _.template($('#tpl-questions').html()),

    render : function()
    {
      var _this = this;
      _this.$el.html(_this.template());

      return _this;
    }
  });

  CT = Backbone.View.extend(
  {
    el : $('#app'),

    initialize : function()
    {
      var _this = this;

      _this.listenOnSocket();
      switch(store.get('state'))
      {
        case 'voter':
          _this.voter();
        break;
        case 'final':
          _this.printFinal();
        break;
        case 'chatter':
          _this.chatter();
        break;
        default:
          _this.login();
        break;
      }
    },

    events :
    {
      'submit #user' : 'submit',
      'click .yes' : 'yes',
      'click .no' : 'no'
    },

    listenOnSocket : function()
    {
      AEI.socket.on('chat', function()
      {
        AEI.app.chatter();
      });
      AEI.socket.on('wipe', function()
      {
        AEI.app.clear();
      });
      AEI.socket.on('clear', function()
      {
        AEI.app.clear();
      });
      AEI.socket.on('voter', function()
      {
        AEI.app.voter();
      });
      AEI.socket.on('final', function()
      {
        AEI.app.printFinal();
      });
    },

    handleAnswer : function(stat)
    {
      AEI.app.printFinal();
      AEI.socket.emit('answer',
      {
        username : store.get('username'),
        type : 'vote',
        value : stat
      });
    },

    yes : function(e)
    {
      e.preventDefault();
      this.handleAnswer(true);
    },

    no : function(e)
    {
      e.preventDefault();
      this.handleAnswer(false);
    },

    submit : function(e)
    {
      e.preventDefault();
      var _this = this,
          input = _this.$('input:text'),
          val   = input.val();

      if(!_.isEmpty(val) && /[a-z]/i.test(val))
      {
        AEI.socket.emit('register', {username : val});
        AEI.socket.on('registered', function(data)
        {
          _this.done(data.username);
          _this.chatter();
        });
      }
    },

    done : function(username)
    {
      var _this = this;
      store.set('username', username);
      _this.current.remove();
    },

    login : function()
    {
      var _this = this;
      _this.current = new Login();
      _this.$el.html(_this.current.render().el);
    },

    voter : function()
    {
      var _this = this;
      store.set('state', 'voter');
      _this.current = new Voter();
      _this.$el.html(_this.current.render().el);
    },

    chatter : function()
    {
      var _this = this;
      store.set('state', 'chatter');
      _this.current = new Chatter();
      _this.$el.html(_this.current.render().el);
      _this.$('input:text').focus();
    },

    printFinal : function()
    {
      var _this = this;
      store.set('state', 'final');
      _this.current = new Final();
      _this.$el.html(_this.current.render().el);
    },

    clear : function()
    {
      store.clear();
      document.location.reload(true);
    }
  });
})(jQuery, io, store, document, window);
