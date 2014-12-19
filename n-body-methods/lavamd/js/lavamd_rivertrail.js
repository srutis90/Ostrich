
if (typeof performance === "undefined") {
    performance = Date;
}

var NUMBER_PAR_PER_BOX = 1;

function DOT(A,B) {
    return ((A[0])*(B[0])
            +(A[1])*(B[1])
            +(A[2])*(B[2]));
}

function createArray(creator, size) {
    var arr = [];
    for(var i=0; i<size; i++) {
        arr.push(creator());
    }
    return arr;
}

function space_mem() {
    //x,y,z,v
    return new Float32Array([0,0,0,0]);
}

function lavamd(boxes1d) {
    var time0, time1;

    // counters
    var i, j, k, l, m, n, expected_boxes1d = 6;

    // system memory
    var par_cpu = {}, dim_cpu = {};
    var box_cpu = [], rv_cpu = [], qv_cpu, fv_cpu = [], nh;
    var neighbors = [];
    var expectedAns = [4144561.0, 181665.0, -190914.0, 140373.0];

    // assign default values
    dim_cpu.cores_arg = 4;
    dim_cpu.boxes1d_arg = boxes1d || 1;

    if(dim_cpu.boxes1d_arg < 0) {
        console.log("ERROR: Wrong value to -boxes1d parameter, cannot be <=0");
        return;
    }
    console.log("Configuration used: cores = %d, boxes1d = %d\n", dim_cpu.cores_arg, dim_cpu.boxes1d_arg);

    // INPUTS
    par_cpu.alpha = 0.5;

    // DIMENSIONS
    // total number of boxes
    dim_cpu.number_boxes = dim_cpu.boxes1d_arg * dim_cpu.boxes1d_arg * dim_cpu.boxes1d_arg;

    // how many particles space has in each direction
    dim_cpu.space_elem = dim_cpu.number_boxes * NUMBER_PAR_PER_BOX;

    // initialize number of home boxes
    nh = 0;

    var box_cpu_ta = new Array(dim_cpu.number_boxes);
    var neighbors_ta = new Array(dim_cpu.number_boxes * 26);
    for(var i=0; i<neighbors_ta.length; i++)
        neighbors_ta[i] = new ParallelArray(new Float32Array(5));
    // home boxes in z direction
    for(i=0; i<dim_cpu.boxes1d_arg; i++){
        // home boxes in y direction
        for(j=0; j<dim_cpu.boxes1d_arg; j++){
            // home boxes in x direction
            for(k=0; k<dim_cpu.boxes1d_arg; k++){

                // current home box
                //[x, y, z, number, offset, nn]

                var nn = 0;
                // neighbor boxes in z direction
                for(l=-1; l<2; l++){
                    // neighbor boxes in y direction
                    for(m=-1; m<2; m++){
                        // neighbor boxes in x direction
                        for(n=-1; n<2; n++){
                            // check if (this neighbor exists) and (it is not the same as home box)
                            var x = (k + n);
                            var y = (j + m);
                            var z = (i + l);
                            if(((z>=0 && y>=0 && x>=0)==true && (z<dim_cpu.boxes1d_arg && y<dim_cpu.boxes1d_arg && x<dim_cpu.boxes1d_arg)==true)   &&
                                    (l==0 && m==0 && n==0)==false){

                                // current neighbor box
                                var neighborIndex = nh * 26 + nn;
                                var number = (z * dim_cpu.boxes1d_arg * dim_cpu.boxes1d_arg) +
                                        (y * dim_cpu.boxes1d_arg) + x;
                                var offset = number * NUMBER_PAR_PER_BOX;

                                var neighbor_ta = new ParallelArray([x, y, z, number, offset]);
                                //console.log("neighbor : " + neighborIndex + "|" + [x, y, z, number, offset].join(";"));
                                neighbors_ta[neighborIndex] = neighbor_ta;
                                nn++;
                                // increment neighbor box
                            }
                        } // neighbor boxes in x direction
                    } // neighbor boxes in y direction
                } // neighbor boxes in z direction
                //x,y,z,number, offset,nn
                box_cpu_ta[nh] = new ParallelArray([k, j, i, nh, nh * NUMBER_PAR_PER_BOX, nn]);
                //console.log("box : " + nh + "|" + [k, j, i, nh, nh * NUMBER_PAR_PER_BOX, nn].join(";"));
                nh = nh + 1; //increment box home
            } // home boxes in x direction
        } // home boxes in y direction
    } // home boxes in z direction

    var box_cpu_pa = new ParallelArray(box_cpu_ta);
    var neighbors_pa = new ParallelArray(neighbors_ta);

    //  PARAMETERS, DISTANCE, CHARGE AND FORCE
    // input (distances)
    var rv_cpu_ta = [];
    for(i=0; i<dim_cpu.space_elem; i=i+1){
        var val4 = (Math.commonRandom() % 10 + 1) / 10.0;
        var val1 = (Math.commonRandom() % 10 + 1) / 10.0;
        var val2 = (Math.commonRandom() % 10 + 1) / 10.0;
        var val3 = (Math.commonRandom() % 10 + 1) / 10.0;
        rv_cpu_ta.push(new ParallelArray([val1, val2, val3, val4]));
    }

    var rv_cpu_pa = new ParallelArray(rv_cpu_ta);

    // input (charge)
    qv_cpu = new Float32Array(dim_cpu.space_elem); // (fp*)malloc(dim_cpu.space_mem2);
    for(i=0; i<dim_cpu.space_elem; i=i+1){
        qv_cpu[i] = (Math.commonRandom()%10 + 1) / 10;            // get a number in the range 0.1 - 1.0
    }

    var qv_cpu_pa = new ParallelArray(qv_cpu);
    // output (forces)
     //(FOUR_VECTOR*)malloc(dim_cpu.space_mem);

    console.log("Rivertrail enabled");
    time0 = performance.now();

    fv_cpu = kernel_cpu_par(par_cpu, dim_cpu, box_cpu_pa, rv_cpu_pa, qv_cpu_pa, neighbors_pa);

    var sum = space_mem();
    for(i=0; i<dim_cpu.space_elem; i=i+1) {
        sum[3] += fv_cpu[i][3];
        sum[0] += fv_cpu[i][0];
        sum[1] += fv_cpu[i][1];
        sum[2] += fv_cpu[i][2];
    }
    console.log("Got: [" + sum[3] + ", " + sum[0] + ", " + sum[1] + ", " + sum[2] + "]");


    if (dim_cpu.boxes1d_arg == expected_boxes1d) {
        if(Math.round(sum[3]) != expectedAns[0] ||
            Math.round(sum[0]) != expectedAns[1] ||
            Math.round(sum[1]) != expectedAns[2] ||
            Math.round(sum[2]) != expectedAns[3]) {
            console.log("Expected: [" + expectedAns[0] + ", " + expectedAns[1] + ", " + expectedAns[2] + ", " + expectedAns[3] + "]");
            console.log("Got: [" + sum[3] + ", " + sum[0] + ", " + sum[1] + ", " + sum[2] + "]");
        }
    } else {
        console.log("WARNING: no self-checking for input size of '%d'\n", dim_cpu.boxes1d_arg);
    }

    time1 = performance.now();
    console.log("Total time: " + (time1-time0) / 1000 + " s");
    return { status: 1,
             options: "lavamd(" + boxes1d + ")",
             time: (time1 - time0) / 1000 };
}

function DOT_PAR(pa1, pa2){
    return pa1.get(0)* pa2.get(0)
    + pa1.get(1) * pa2.get(1)
    + pa1.get(2) * pa2.get(2);
}


function kernel_cpu_par(par_cpu, dim_cpu, box_cpu_pa, rv_cpu_pa, qv_cpu_pa, neighbors_pa){

    var alpha = par_cpu.alpha;
    var a2 = 2.0*alpha*alpha;

    var fv_cpu_pa = rv_cpu_pa.combine(function(idx1, box_cpu_pa, neighbors_pa, qv_cpu_pa, NUMBER_PAR_PER_BOX, a2){
            var pointer;
            var idx = idx1[0];
            var l = Math.floor(idx / NUMBER_PAR_PER_BOX);
            var thisBox = box_cpu_pa.get(l);
            var x = 0, y = 0, z = 0, v = 0;
            //  Do for the # of (home+neighbor) boxes
            for (var k = 0; k < (1 + thisBox.get(5)); k++) {
                //  neighbor box - get pointer to the right box
                if (k == 0) {
                    pointer = l;    // set first box to be processed to home box
                } else {
                    var boxNeighborStart = l * 26;
                    pointer = neighbors_pa.get(boxNeighborStart + k - 1).get(3);   // remaining boxes are neighbor boxes
                }

                var first_j = box_cpu_pa.get(pointer).get(4);
                for (var j = 0; j < NUMBER_PAR_PER_BOX; j = j + 1) {
                    var rv_fii = this.get(idx);
                    var rv_fjj = this.get(first_j + j);
                    var qv_fjj = qv_cpu_pa.get(first_j + j);


                    var dotProduct = DOT_PAR(rv_fii, rv_fjj);
                    var r2 = rv_fii.get(3) + rv_fjj.get(3) - dotProduct;

                    var u2 = a2 * r2;
                    var vij = Math.exp(-u2);
                    var fs = 2. * vij;
                    var dx = rv_fii.get(0) - rv_fjj.get(0);
                    var dy = rv_fii.get(1) - rv_fjj.get(1);
                    var dz = rv_fii.get(2) - rv_fjj.get(2);

                    var fxij = fs * dx;
                    var fyij = fs * dy;
                    var fzij = fs * dz;

                    // forces [x,y,z,v]
                    v += qv_fjj * vij;
                    x += qv_fjj * fxij;
                    y += qv_fjj * fyij;
                    z += qv_fjj * fzij;
                }
            }
            return [x,y,z,v];

    }, box_cpu_pa, neighbors_pa, qv_cpu_pa, NUMBER_PAR_PER_BOX, a2);

    return fv_cpu_pa.getArray();
}


function runLavaMD(boxes1d) {
    return lavamd(boxes1d);
}
