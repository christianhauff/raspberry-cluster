
  console.log("trying connect");
  var socket = new WebSocket("ws://localhost:8001", "text")
  
  socket.onopen = function () {
  console.log("onopen")
  };

  socket.onmessage = function (evt) { 
    var received_msg = JSON.parse(evt.data);
      document.getElementById("log").innerHTML = new Date().toISOString() + "\n\n" + received_msg.log + "<br>" || ""
      document.getElementById("display").innerHTML = received_msg.display || ""
  };

  socket.onerror = function (error) {
    console.log("onerror")
    socket.close();
  };

  socket.onclose = function() {
    console.log("onclose");
  }


function wsset(mode) {
  socket.send(mode)
}
