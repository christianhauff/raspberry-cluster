#!/bin/bash

######      Interface configuration      ######

iface_pub="wlan0"     #interface having connection to the public internet
iface_cluster="eth0"  #interface connected to the cluster

### Don't change anything below this point! ###

ipforward=$(cat /proc/sys/net/ipv4/ip_forward)

if [ $ipforward -ne '1' ];
then
printf "ipv4 forwarding has to be activated. This is done by the command \
'sysctl -w net.ipv4.ip_forward=1'. Do you want to execute it now? (y/n) "
read execconfirm

  if [ "$execconfirm" == "y" ];
  then
    sysctl -w net.ipv4.ip_forward=1
  else
    echo "You have to activate ipv4 forwarding manually before continuing."
    exit 0
  fi

else
echo "ipv4 forwarding is activated correctly"
fi

printf "Is it correct that your network interface ${iface_pub} is connected \
to the public internet and the interface ${iface_cluster} is connected to the \
cluster? (y/n) "
read ifaceconfirm

if [ "$ifaceconfirm" != "y" ];
then
echo "Please edit the variables in the top lines of this script to fit \
your network configuration"
exit 0
fi

echo "Applying iptables rules"

sudo iptables -t nat -A POSTROUTING -o ${iface_pub} -j MASQUERADE
sudo iptables -A FORWARD -i ${iface_pub} -o ${iface_cluster} -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i ${iface_cluster} -o ${iface_pub} -j ACCEPT

echo "Done! This computer is working as a router for the Cluster now!"
exit 0
