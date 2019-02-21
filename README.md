# Raspberry-Cluster

> Project repository with helper scripts for deploying a raspberry cluster using MongoDB

# Flashing SD Cards

* Setup Raspberry including static IP Configuration, Password, SSH-Key, localization, ...
* Create image file (see [here](http://www.aoakley.com/articles/2015-10-09-resizing-sd-images.php)
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

# Ansible

General Usage

```
cd ansible
ansible-playbook -i <inventory file> <playbook file>
```

## Playbook Files

### setup_replication.yml

* General Raspberry Setup
  * Set gateway to access internet
  * Set hostname
  * execute expand_rootfs if needed
* Basic installation of MongoDB
* Setup of the Replication Master

### reset_replication.yml

* remove the 'local' database on all replicas to erase replica configuration

### setup_sharding.yml

* * General Raspberry Setup
  * Set gateway to access internet
  * Set hostname
  * execute expand_rootfs if needed
* Basic installation of MongoDB
* Setup of mongoc instances (configuration servers)
* Setup of mongos instances (shard router)
* Initialization of Shards
