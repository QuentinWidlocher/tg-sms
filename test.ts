const res = await fetch("https://keyvalue.immanuel.co/api/KeyVal/GetValue/m5m6yz04/test", {
    "method": "GET",
});

const json = await res.json();

console.log(typeof json);
console.log(json);
