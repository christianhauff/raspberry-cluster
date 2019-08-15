#!/usr/bin/env node

const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));

try {
  app.listen(port, () => console.log(`cluster-monitor app listening on port ${port}!`));
}
catch(err) {
  console.log(err)
  process.exit(0)
}

var mode = "default";

var pingstats = {};
var insObj = [];

//times for performance measurement
var perfstats = {
  "cluster": [],
  "single": []
}

// performance measurement pending
var pending = {
  "cluster": false,
  "single": false,
}


const net = require('net')

var ws = require("nodejs-websocket")
var server = ws.createServer(function (conn) {
    console.log("New connection");
    conn.on("text", function (str) {
      if (['default','shstatus','sharddistribution', 'doccount', 'repsetstatus', 'ping', 'perf'].indexOf(str) > -1) {
        mode = str;
        console.log("changed: " + mode);
        monitorLoop();
      }
      if (['perf_cluster', 'perf_single', 'perf_clear'].indexOf(str) > -1) {
        if (str == 'perf_cluster') {
          let client = new net.Socket();
          client.connect({ port: 8080, host: '192.168.1.1' }, function() {});
          client.on('data', function(chunk) {perfstats.cluster.push(chunk.toString());client.end();pending.cluster = false});
          pending.cluster = true;
        }
        else if (str == 'perf_single') {
          let client = new net.Socket();
          client.connect({ port: 8080, host: '192.168.1.30' }, function() {});
          client.on('data', function(chunk) {perfstats.single.push(chunk.toString());client.end();pending.single = false;});
          pending.single = true;
        }
        else if (str == 'perf_clear') {
          perfstats.cluster = []; perfstats.single = [];
          console.log("measurements cleared");
        }

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
  var out_log = "";
  var out_display = "";

 switch (mode) {

  case "shstatus":
  out_display += "Command: <pre>sh.status({verbose:true})</pre><br>";

  out_log += dbstats.getShStatus();
  break;

  case "default":
  case "sharddistribution":
  var shardDist = dbstats.getShardDistribution();
  out_log += shardDist;

  var shardDistRegex = new RegExp("Shard ([\w]+)")

  var distributionStrings = shardDist.match(/Shard (\w+) contains ([\d\.%]+)/g)

  //console.log(JSON.stringify(distributionStrings, null, 2))

  out_display += "Command: <pre>db.testCollection.getShardDistribution()</pre><br><br>";
  out_display += "<div class='progress-outer'>";

  var colors = ['#099E09', '#1E90FF', '#c63423', '#b4b737']

  if (distributionStrings){
    for (i=0; i<distributionStrings.length; i++) {
      let shardInfo = distributionStrings[i]
      let shardInfoFields = shardInfo.split(" ")

      //console.log("name: " + shardInfoFields[1] + "; perc: " + shardInfoFields[3])

      out_display += "<span class='progress-inner' style='width: " + shardInfoFields[3] + "; background-color: " + colors[i] + ";'>" + shardInfoFields[1] + ": " + shardInfoFields[3] + "</span>"
    }
  }

  break;

  case "doccount":
  out_display += "Command: <pre>db.testCollection.count()</pre><br>";

  out_log += dbstats.getDocNumber();
  break;

  case "repsetstatus":

  out_display += "Command: <pre>rs.status()</pre> (executed on every node) <br><br>";

  var rsStatus = dbstats.getRsStatus();
  out_log += JSON.stringify(rsStatus, null, 2);

  try {

    //RS1

    out_display += `<table>\n<tr>\n<td>RS1</td>\n`
    var members = rsStatus.rs1.members;
    for (i=0; i<members.length; i++) {
      if (members[i].health == 1) {
        out_display +=  "<td class='host_alive'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
      else {
        out_display +=  "<td class='host_dead'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
    }
    out_display += "</tr>"

    //RS2

    out_display += `<tr>\n<td>RS2</td>\n`
    var members = rsStatus.rs2.members;
    for (i=0; i<members.length; i++) {
      if (members[i].health == 1) {
        out_display +=  "<td class='host_alive'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
      else {
        out_display +=  "<td class='host_dead'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
    }
    out_display += "</tr>"

    //RS3

    out_display += `<tr>\n<td>RS3</td>\n`
    var members = rsStatus.rs3.members;
    for (i=0; i<members.length; i++) {
      if (members[i].health == 1) {
        out_display +=  "<td class='host_alive'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
      else {
        out_display +=  "<td class='host_dead'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
    }
    out_display += "</tr>"

    //RS4

    out_display += `<tr>\n<td>RS4</td>\n`
    var members = rsStatus.rs4.members;
    for (i=0; i<members.length; i++) {
      if (members[i].health == 1) {
        out_display +=  "<td class='host_alive'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
      else {
        out_display +=  "<td class='host_dead'>" + members[i].name.slice(0,-6) + "<br>" + members[i].stateStr + "</td>\n"
      }
    }
    out_display += "</tr>"

    out_display += "</table>"
  }
  catch (e) {
    console.log("repsetstatus failed")
  }

  break;

  case "ping":
  out_log = JSON.stringify(pingstats, null, 2);

  out_display = "<table>"
  var nth = 0;
  for (var host in pingstats) {
    if (nth%5==0){
      if (nth !== 0) {
        out_display += "</tr>";
      }
      out_display += "<tr>";
    }
    if (pingstats[host] == "Alive") {
      out_display += "<td class='host_alive'>"+host+"</td>"
    }
    else {
      out_display += "<td class='host_dead'>"+host+"</td>"
    }
    nth++;
  }
  out_display += "</tr>";

  break;

  case "perf":

  out_display = "<button onClick='wsset(\"perf_cluster\")'>" + ((pending.cluster) ? "Pending measurement" : "Insert to Cluster") + "</button>";
  out_display += "<button onclick='wsset(\"perf_single\")'>" + ((pending.single) ? "Pending measurement" : "Insert to Single MongoDB")+"</button>";
  out_display += "<button onclick='wsset(\"perf_clear\")'>Clear</button><br><br>\n\n";

  let maxlength = 0;
  if (perfstats.cluster.length > maxlength) {maxlength = perfstats.cluster.length}
  if (perfstats.single.length > maxlength) {maxlength = perfstats.single.length}

  out_display += "<table><tr><th>Cluster</th><th>Single</th><tr>";

  for (i=0; i<maxlength; i++) {
    out_display += "<tr><td>";
    if (perfstats.cluster[i] != undefined) {out_display += String(Math.round(perfstats.cluster[i]*100)/100)}
    out_display += "</td><td>"
    if (perfstats.single[i] != undefined) {out_display += String(Math.round(perfstats.single[i]*100)/100)}
    out_display += "</td></tr>"
  }

  //average
  out_display += "<tr><td>Ø" + String(Math.round(array_average(perfstats.cluster)*100)/100) + "</td>";
  out_display += "<td>Ø" + String(Math.round(array_average(perfstats.single)*100)/100) + "</td></tr>";

  out_display += "</table>"

  break;

  } // end switch

  var outval = {};
  outval["display"] = out_display;
  outval["log"] = out_log;

  broadcast(server, JSON.stringify(outval));

} //end monitorLoop function

function array_average(array) {
  let sum = 0;

  if (array.length == 0) {
    return "N/A"
  }

  for (i=0; i<array.length; i++) {
    sum += parseFloat(array[i]);
  }

  return sum/array.length

}

var targets = ['192.168.1.1', '192.168.1.10', '192.168.1.11', '192.168.1.12', '192.168.1.13', '192.168.1.14', 
  '192.168.1.15', '192.168.1.16', '192.168.1.17', '192.168.1.18', '192.168.1.19',
  '192.168.1.20', '192.168.1.21', '192.168.1.22', '192.168.1.23', '192.168.1.24', 
  '192.168.1.25', '192.168.1.26', '192.168.1.27', '192.168.1.28', '192.168.1.29', '192.168.1.30'];

var rs1members = ['192.168.1.10', '192.168.1.11', '192.168.1.12', '192.168.1.13', '192.168.1.14'];
var rs2members = ['192.168.1.15', '192.168.1.16', '192.168.1.17', '192.168.1.18', '192.168.1.19'];
var rs3members = ['192.168.1.20', '192.168.1.21', '192.168.1.22', '192.168.1.23', '192.168.1.24'];
var rs4members = ['192.168.1.25', '192.168.1.26', '192.168.1.27', '192.168.1.28', '192.168.1.29'];

if (exec("whoami").toString() == "root\n") {
  var ping = require('net-ping'); //root required
  setInterval(pingLoop, 2000);
}
else {
  pingstats["error"] = "root privileges required for ping";
}

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
    var status = {};

    for (i=0; i<rs1members.length; i++) {
      try {
        var result = exec("mongo testdb --host " + rs1members[i] + " --eval 'JSON.stringify(rs.status(), null, 2)';");
        status["rs1"] = JSON.parse(result.toString().split("\n").splice(2).join("\n"));
        i>0 ? console.log("rs1: call to member " + i + " succeeded") : null;
        break;
      }
      catch(e) {
        console.log("rs1: call to member " + rs1members[i] + " failed");
        continue;
      }
    }

    for (i=0; i<rs2members.length; i++) {
      try {
        var result = exec("mongo testdb --host " + rs2members[i] + " --eval 'JSON.stringify(rs.status(), null, 2)';");
        status["rs2"] = JSON.parse(result.toString().split("\n").splice(2).join("\n"));
        i>0 ? console.log("rs2: call to member " + i + " succeeded") : null;
        break;
      }
      catch(e) {
        console.log("rs2: call to member " + rs2members[i] + " failed");
        continue;
      }
    }

    for (i=0; i<rs3members.length; i++) {
      try {
        var result = exec("mongo testdb --host " + rs3members[i] + " --eval 'JSON.stringify(rs.status(), null, 2)';");
        status["rs3"] = JSON.parse(result.toString().split("\n").splice(2).join("\n"));
        i>0 ? console.log("rs3: call to member " + i + " succeeded") : null;
        break;
      }
      catch(e) {
        console.log("rs3: call to member " + rs3members[i] + " failed");
        continue;
      }
    }

    for (i=0; i<rs4members.length; i++) {
      try {
        var result = exec("mongo testdb --host " + rs4members[i] + " --eval 'JSON.stringify(rs.status(), null, 2)';");
        status["rs4"] = JSON.parse(result.toString().split("\n").splice(2).join("\n"));
        i>0 ? console.log("rs4: call to member " + i + " succeeded") : null;
        break;
      }
      catch(e) {
        console.log("rs4: call to member " + rs4members[i] + " failed");
        continue;
      }
    }



    return status
  }
}

