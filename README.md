# Raspberry-Cluster

> Project repository with helper scripts for deploying a raspberry cluster using MongoDB

# Flashing SD Cards

* Setup Raspberry including static IP Configuration, Password, SSH-Key, localization, ...
* Create image file (see [here](http://www.aoakley.com/articles/2015-10-09-resizing-sd-images.php))
* For flashing all SD-Cards of the cluster, use `image-manager`

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

# Start Router

`start_router.sh` is a script to start NAT Forwarding on a computer that connects the cluster to the internet. ipv4 forwarding has to be activated seperately

In this case, wlan0 has access to an external network and eth0 is connected to the cluster.

# Ansible

General Usage

```
cd ansible
ansible-playbook -i <inventory file> <playbook file>
```

## Inventory Files

* hosts01-19
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
    * 
* Hosts mongoc
  * Role reset_configsrv
    * 
* Hosts mongos
  * Role reset_sharding
    * 

### setup_repsharding.yml

### setup_monitoring.yml