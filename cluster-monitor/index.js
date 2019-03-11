const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));

app.listen(port, () => console.log(`cluster-monitor app listening on port ${port}!`));
var mode = "default";

var pingstats = {};

var ws = require("nodejs-websocket")
var server = ws.createServer(function (conn) {
    console.log("New connection");
    conn.on("text", function (str) {
      if (['default','shstatus','sharddistribution', 'doccount', 'repsetstatus', 'ping'].indexOf(str) > -1) {
        mode = str;
        console.log("changed: " + mode);
        monitorLoop();
      }
    })
    conn.on("close", function (code, reason) {
        console.log("Connection closed");
    })
}).listen(8001, () => console.log(`Websocket listening on port 8001!`));

function broadcast(server, msg) {
    server.connections.forEach(function (conn) {
        conn.sendText(msg);
    })
}

var exec = require('child_process').execSync;

var dbstats = new dbstats();


setInterval(monitorLoop, 1000);

function monitorLoop() {
  //broadcast(server, "ping")
  var outval = "";

 switch (mode) {
  
  case "default":
  outval += dbstats.getShardDistribution();
  outval += dbstats.getDocNumber();
  break;
  
  case "shstatus":
  outval += dbstats.getShStatus();
  break;
  
  case "sharddistribution":
  outval += dbstats.getShardDistribution();
  break;
  
  case "doccount":
  outval += dbstats.getDocNumber();
  break;
  
  case "repsetstatus":
  outval += dbstats.getRsStatus();
  break;
  
  case "ping":
  outval = JSON.stringify(pingstats, null, 2);
  break;
  
  }
  
  broadcast(server, outval);
}

var targets = ['192.168.1.1', '192.168.1.10', '192.168.1.11', '192.168.1.12', '192.168.1.13', '192.168.1.14', '192.168.1.15', '192.168.1.16', '192.168.1.17', '192.168.1.18', '192.168.1.19'];
var ping = require('net-ping'); //root required
setInterval(pingLoop, 2000);

function pingLoop() {
  
  var session = ping.createSession({timeout: 500});
  
  for (i=0; i<targets.length; i++) {
    session.pingHost(targets[i], function(e, t) {
      if (!e) {
        pingstats[t] = "Alive";
      }
      else {
        pingstats[t] = "Dead";
      }
    });
  }
}

function dbstats() {
  this.getDocNumber = function() {
    return exec("mongo testdb --eval 'db.testCol.count()'").toString().split("\n").splice(2).join("\n");
  }
  
  this.getShardDistribution = function() {
    return exec("mongo testdb --eval 'db.testCol.getShardDistribution()'").toString().split("\n").splice(2).join("\n");
  }
  
  this.getShStatus = function() {
    return exec("mongo testdb --eval 'sh.status({verbose:true})'").toString().split("\n").splice(2).join("\n");
  }
  
  this.getRsStatus = function() {
    return exec("mongo testdb --host raspi1_10 --eval 'JSON.stringify(rs.status(), null, 2)';mongo testdb --host raspi1_15 --eval 'JSON.stringify(rs.status(), null, 2)';");
  }
}
