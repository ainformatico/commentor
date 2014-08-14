(function($, io, window)
{
  window.AEI = window.AEI || {};

  AEI.socket = io.connect(window.location.protocol + '//' + window.location.host);

  $('#app').on('click', 'button', function(e)
  {
    var button = $(e.target);
    AEI.socket.emit('system', {type : button.data('type')});
  });

})(jQuery, io, window);
