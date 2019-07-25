# Raspberry-Cluster

> Project repository with helper scripts for deploying a raspberry cluster using MongoDB

# Basics

The contents of this repository help creating a cluster of multiple Raspberry Pi Computers running a MongoDB Database Software to show the fundamentals of Replication (splitting the same data on multiple machines for redunancy) and Sharding (splitting the datasets on several machines to distribute storage and computing power). Using the Cluster, also effects of network partitions (unplugging single computers from the cluster) and performance measurements can be observed. The PoC-Setup uses a Cisco SF250-48 Switch.

## Raspberry Pi

![](https://projects-static.raspberrypi.org/projects/raspberry-pi-setting-up/3addc4ca2ca0b7c999bdb03a46801a729614b235/en/images/pi-labelled.png)

The Raspberry Pi is a cheap single-board computer developed by the Raspberry Pi Foundation. The (at the beginning of this project) latest model, the Pi 3 B+ is the size of a credit card and equipped with an ARMv8-Processor, multiple USB-Ports, a LAN-Port, a WiFi-Module, an HDMI and audio output as well as several programmable GPIO-Pins. The Raspberry is used in many tinker-projects and prototypes as it is cheap, has a relatively low power consumption and various communication interfaces to integrate it into different environments. The mostly used operating system is Raspbian Linux, which is derived from Debian.

## MongoDB

![MongoDB Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/MongoDB_Logo.svg/1920px-MongoDB_Logo.svg.png)

[MongoDB](https://www.mongodb.com/) is a NoSQL database software that is mainly focused on scalability. It's source code is available under SSPL License and is free to use, as long as all modifications are made publicly available (as of july 2019).

### Components

#### mongod

`mongod` is the service to run the actual database instance.

#### mongos

`mongos` is the shard router. Per database cluster, there is at least one `mongos`-instance needed that serves an endpoint to the actual application using the database. It will route the request to the shard where the required data is located.

#### mongoc

`mongoc` is a configuration server for a sharded setup. Usually, multiple `mongoc`-instances are used for redundancy. They all have to be known to the `mongos`-instances to allow the sharding to work correctly.

# Preparing the SD Cards

To setup the cluster, all Raspberrys have to be prepared for remote access. One Raspberry has to be configured manually: 

* (recommended) Change default password for user "pi"
* sudo raspi-config
  * Localization Options -> Change Locale -> de_DE.UTF-8 UTF-8 (choose appropriate)
  * Localization Options -> Change Timezone -> Europe/Berlin (choose appropriate)
  * Localization Options -> Change Keyboard Layout -> Generic 105-key -> German (choose appropriate)
  * Enable SSH Server
* Edit /etc/network/interfaces
  ```
  auto eth0
  allow-hotplug eth0

  iface eth0 inet static
  address 192.168.1.1
  ```
* Generate an SSH-Keypair (privatekey will be needed later for ansible)

Once the first Raspberry is configured, an image of the SD-Card must be created. Refer to http://www.aoakley.com/articles/2015-10-09-resizing-sd-images.php. It is highly recommended to shrink the image file after creation as described in the article above.

For quickly replicating this ready configured OS on all other SD Cards, the script `image-manager` can be used. The IP Adresses (`-modip`) must be set consecutive or at least unique to allow all Raspberrys to be operated in the same network.

Usage:
```
> ./image-manager
Usage: image-manager [-modip 1.1.1.1] [-flash /dev/sdb] -img file.img

-modip:  Image will be mounted and the IP Address in 
         /etc/network/interfaces will be modified before flashing
-flash:  The device to flash to, usually /dev/sdb
         (the option '/dev/sda' will be blocked)
-img:    the image file used
```

To make all Raspberrys easily accessible, the computer from where the cluster should be configured (also connected to the network switch, together with all raspberrys) must also have a static IP Address in the same Subnet (e.g. 192.168.1.2). A file `~/.ssh/config` has to be created, containing a block for each raspberry of the cluster, see below:

```
Host raspi1_1
  HostName 192.168.1.1
  User pi
  IdentityFile ~/.ssh/raspi.priv
```

For each Device, the Host (e.g. raspi1_1) and the IP-Address (e.g. 192.168.1.1) have to be modified. The Privatekey used for the configuration of the initial Raspberry must be present at the `IdentityFile`-Path. For more information on ssh config, refer [here](https://www.ssh.com/ssh/config/).

The IP Configuration used for the project is the following (any ip range can be used as long as the addresses are unique):

|Address(-range)|Usage|
|---|---|
|192.168.1.1|"Master"-Raspberry (Monitoring, mongos router)|
|192.168.1.2|Computer used for configuring the cluster, running ansible|
|192.168.1.10-29|20 Cluster Nodes|
|192.168.1.30|Separate Raspberry running mongodb for reference measurements|

# Start Router

If the IP-Adresses are chosen out of a free range in an existing network, the cluster can be directly attached to the LAN by connecting them all over a network switch. As this is a bit confusing and may cause security issues, it is recommended to run the cluster in a separate network over a network switch, where just one computer for configuration is connected to. This computer also needs a connection to the public internet to allow MongoDB being pulled from the packet sources. Therefore, this computer is also used as a router between the cluster-network and the public one. For example, a notebook can be used, which is connected to the Internet over Wifi and via LAN to the cluster switch. `start_router.sh` is a script to start NAT forwarding on that computer to route outgoing traffic from the cluster to the public internet. ipv4 forwarding has to be activated seperately (add `net.ipv4.ip_forward = 1` to `/etc/sysctl.conf` and reboot, check with `cat /proc/sys/net/ipv4/ip_forward`, refer [here](http://www.ducea.com/2006/08/01/how-to-enable-ip-forwarding-in-linux/))

In the case of this script, wlan0 has access to an external network and eth0 is connected to the cluster, modify as appropriate if needed. 

# Ansible

General Usage

```
cd ansible
ansible-playbook -i <inventory file> <playbook file>
```

## Inventory Files

* fullcluster.hosts
    * mongo_servers: all servers where the mongodb will be installed
    * mongod_servers: servers for replication without sharding
    * replication_master: initial masters for each shard
    * shard_masters: !!! initial masters for each shard
    * shard_servers: servers contained in shards/replica sets
    * rs1: servers in replica set 1 (compare replSet=rs1)
    * rs2: servers in replica set 2
    * mongos: server(s) where mongos should be running
    * mongoc: server(s) where mongoc should be running
    * monitoring: server where the nodejs monitoring should be deployed

## Playbook Files

### setup_replication.yml

* All hosts
  * Role setup_raspberry
    * Setting the correct gateway to access the internet
    * Setting hostnames
    * execute expand_rootfs if needed
    * reboot if necessary
* Hosts mongod_servers
  * Role setup_mongod
    * install mongodb via apt
    * create mongodb.conf and data directory
    * start mongodb and initialize replication set on master
* Hosts replication_master
  * Role setup_replication_master
    * initialize whole replica set

### reset_replication.yml

* Hosts mongo_servers
  * Role reset_replication
    * removing and recreating the whole database directory
    * restart mongodb service

### setup_sharding.yml

* All Hosts
  * Role setup_raspberry
    * Setting the correct gateway to access the internet
    * Setting hostnames
    * execute expand_rootfs if needed
    * reboot if necessary
* Hosts mongod_servers
  * Role setup_mongod
    * Install Mongodb via apt
    * create mongod.conf and database directory
    * start mongodb
    * execute rs.initiate() on master
* Hosts shard_masters
  * Role init_single_rs
    * add replSet to config
    * execute rs.initiate()
* Hosts mongoc
  * Role setup_mongoc
    * create database directory, init.d-file, logfile, service file and mongoc.conf
    * start mongoc
* Hosts mongos
  * Role setup_mongos
    * create init.d-file and service-file
    * start mongos service
  * Role setup_shards
    * execute addShard for all shard servers
    * create database 'testdb' and sharded collection 'testCol'
    * set chunk size to 1MB for demo purposes (default 64MB)
    * insert random test data

### reset_sharding.yml

* Hosts shard_servers
  * Role reset_replication
    * removing and recreating the whole database directory
    * restart mongodb service
* Hosts mongoc
  * Role reset_configsrv
    * removing and recreating the whole configsrv database directory
* Hosts mongos
  * Role reset_sharding
    * executing reset script removing all shards

### setup_repsharding.yml

* Execute Playbook `reset_sharding.yml`
* Hosts mongos
  * Role setup_mongos
    * create init.d-file and service-file
    * start mongos service
* Hosts shard_servers
  * Role repshards_config
    * set correct replSet in mongodb.conf
    * restart mognodb
* Hosts shard_masters
  * Role setup_repshards
    * add all hosts of replica set to set
* Hosts mongoc
  * Role setup_mongoc
    * create database directory, init.d-file, logfile, service file and mongoc.conf
    * start mongoc
* Hosts mongos
  * Role init_repshards
    * restart mongos
    * execute script adding shards
    * inserting test data

### setup_monitoring.yml

* copy and start node.js-project for cluster monitoring

# Monitoring

For easier monitoring of the cluster, `/cluster-monitor` contains a node.js-Application to allow viewing the stats of the cluster in realtime. The application has to be deployed on the Device running the mongoc-service (routing). 
