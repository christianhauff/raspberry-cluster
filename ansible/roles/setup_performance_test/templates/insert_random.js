function rand() {return Math.round(Math.random()*1000000)};

db = db.getSiblingDB('testdb');

for (i=0;i<20000;i++){db.testCol.insert({key:rand(),val1:rand(),val2:rand()});}
