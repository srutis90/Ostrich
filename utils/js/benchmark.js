//for(var i=0; i<5; i++){
//    bwa_hmm('n', 512);
//}
//
//for(var i=0; i<5; i++)
//    runPageRank();

//spmvRun(dim, density, stddev, iterations)

//for(var i=0; i<5;i++)
//    spmvRun(50000, 2000, 0.01, 5);


var pa = new ParallelArray([1,2,3]);
var cubes = pa.map(function(x){return x*x*x;});
console.log(cubes.data[0]);
console.log(cubes.data[1]);
console.log(cubes.data[2]);