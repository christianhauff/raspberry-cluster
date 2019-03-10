
  console.log("trying connect");
  var socket = new WebSocket("ws://localhost:8001", "text")
  
  socket.onopen = function () {
  console.log("onopen")
  };

  socket.onmessage = function (evt) { 
    var received_msg = evt.data;
    if (document.getElementById("append").checked) {
      document.getElementById("log").innerHTML += new Date().toISOString() + "\n\n" + received_msg + "<br>"
    }
    else {
      document.getElementById("log").innerHTML = new Date().toISOString() + "\n\n" + received_msg + "<br>"
    }
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
