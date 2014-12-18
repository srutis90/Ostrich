
if (typeof performance === "undefined") {
    performance = Date;
}

var NUMBER_PAR_PER_BOX = 100;

function DOT(A,B) {
    return ((A[0])*(B[0]) + (A[1])*(B[1]) + (A[2])*(B[2]));
}

function createArray(creator, size) {
    var arr = [];
    for(var i=0; i<size; i++) {
        arr.push(creator());
    }
    return arr;
}

function nei_str() {
    // neighbor box
    //x,y,x,number, offset
    return new Float32Array([0,0,0,0,0]);
}

function createBoxes(nBox) {
    // neighbor box
    //x,y,z,number, offset, nn
    return new Float32Array(nBox * 6);
}

function createNeighbors(nBox){
    //x,y,x,number, offset
    // 26 neighbors each body
    return new Float32Array(nBox * 26 * 5);
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

    // BOX
    box_cpu = createBoxes(dim_cpu.number_boxes);
    neighbors = createNeighbors(dim_cpu.number_boxes);
    // initialize number of home boxes
    nh = 0;

    // home boxes in z direction
    for(i=0; i<dim_cpu.boxes1d_arg; i++){
        // home boxes in y direction
        for(j=0; j<dim_cpu.boxes1d_arg; j++){
            // home boxes in x direction
            for(k=0; k<dim_cpu.boxes1d_arg; k++){

                // current home box
                //[x, y, x, number, offset, nn]
                box_cpu[nh * 6 + 0] = k;
                box_cpu[nh * 6 + 1] = j;
                box_cpu[nh * 6 + 2] = i;
                box_cpu[nh * 6 + 3] = nh;
                box_cpu[nh * 6 + 4] = nh * NUMBER_PAR_PER_BOX;

                // initialize number of neighbor boxes
                box_cpu[nh * 6 + 5] = 0;

                // neighbor boxes in z direction
                for(l=-1; l<2; l++){
                    // neighbor boxes in y direction
                    for(m=-1; m<2; m++){
                        // neighbor boxes in x direction
                        for(n=-1; n<2; n++){
                            // check if (this neighbor exists) and (it is not the same as home box)
                            if((((i+l)>=0 && (j+m)>=0 && (k+n)>=0)==true && ((i+l)<dim_cpu.boxes1d_arg && (j+m)<dim_cpu.boxes1d_arg && (k+n)<dim_cpu.boxes1d_arg)==true)   &&
                                    (l==0 && m==0 && n==0)==false){

                                // current neighbor box
                                var nn = box_cpu[nh * 6 + 5];
                                var neighborIndex = nh * 26 + nn;
                                neighbors[neighborIndex * 5 + 0] = (k+n);
                                neighbors[neighborIndex * 5 + 1] = (j+m);
                                neighbors[neighborIndex * 5 + 2] = (i+l);
                                neighbors[neighborIndex * 5 + 3] =
                                    (neighbors[neighborIndex * 5 + 2] * dim_cpu.boxes1d_arg * dim_cpu.boxes1d_arg) +
                                    (neighbors[neighborIndex * 5+ 1] * dim_cpu.boxes1d_arg) +
                                    neighbors[neighborIndex * 5+ 0];
                                neighbors[neighborIndex * 5+ 4] = neighbors[neighborIndex * 5 + 3] * NUMBER_PAR_PER_BOX;

                                // increment neighbor box
                                box_cpu[nh * 6 + 5] = nn + 1;
                            }
                        } // neighbor boxes in x direction
                    } // neighbor boxes in y direction
                } // neighbor boxes in z direction
                // increment home box
                nh = nh + 1;
            } // home boxes in x direction
        } // home boxes in y direction
    } // home boxes in z direction

    //  PARAMETERS, DISTANCE, CHARGE AND FORCE
    // input (distances)
    rv_cpu = createArray(space_mem, dim_cpu.space_elem); //(FOUR_VECTOR*)malloc(dim_cpu.space_mem);
    for(i=0; i<dim_cpu.space_elem; i=i+1){
        rv_cpu[i][3] = (Math.commonRandom()%10 + 1) / 10.0;        // get a number in the range 0.1 - 1.0
        rv_cpu[i][0] = (Math.commonRandom()%10 + 1) / 10.0;        // get a number in the range 0.1 - 1.0
        rv_cpu[i][1] = (Math.commonRandom()%10 + 1) / 10.0;        // get a number in the range 0.1 - 1.0
        rv_cpu[i][2] = (Math.commonRandom()%10 + 1) / 10.0;        // get a number in the range 0.1 - 1.0
    }

    // input (charge)
    qv_cpu = new Float64Array(dim_cpu.space_elem); // (fp*)malloc(dim_cpu.space_mem2);
    for(i=0; i<dim_cpu.space_elem; i=i+1){
        qv_cpu[i] = (Math.commonRandom()%10 + 1) / 10;            // get a number in the range 0.1 - 1.0
    }

    // output (forces)
    fv_cpu = createArray(space_mem, dim_cpu.space_elem); //(FOUR_VECTOR*)malloc(dim_cpu.space_mem);

    console.log("Rivertrail enabled");
    time0 = performance.now();

    kernel_cpu(par_cpu, dim_cpu, box_cpu, rv_cpu, qv_cpu, fv_cpu, neighbors);

    var sum = space_mem();
    if (dim_cpu.boxes1d_arg == expected_boxes1d) {
        for(i=0; i<dim_cpu.space_elem; i=i+1) {
            sum[3] += fv_cpu[i][3];
            sum[0] += fv_cpu[i][0];
            sum[1] += fv_cpu[i][1];
            sum[2] += fv_cpu[i][2];
        }
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

function kernel_cpu(par, dim, box, rv, qv, fv, nei) {
    var alpha, a2;                      // parameters
    var i, j, k, l;                     // counters
    var first_i, pointer, first_j;      // neighbor box
    // common
    var r2, u2, fs, vij, fxij, fyij, fzij;
    var d;

    //  INPUTS
    alpha = par.alpha;
    a2 = 2.0*alpha*alpha;
    // PROCESS INTERACTIONS

    for(l=0; l<dim.number_boxes; l=l+1) {
        // home box - box parameters
        first_i = box[l * 6 + 4];

        //  Do for the # of (home+neighbor) boxes
        var offset = box[l * 6 + 5];
        for(k=0; k<(1+ offset); k++) {
            //  neighbor box - get pointer to the right box
            if(k==0) {
                pointer = l;    // set first box to be processed to home box
            } else {
                var boxNeighborStart = l * 26;
                pointer = nei[(boxNeighborStart + k-1) * 5 + 3];   // remaining boxes are neighbor boxes
            }

            first_j = box[pointer * 6 + 4];

            for(i=0; i<NUMBER_PAR_PER_BOX; i=i+1) {
                for(j=0; j<NUMBER_PAR_PER_BOX; j=j+1) {
                    r2 = rv[first_i+i][3] + rv[first_j+j][3] - DOT(rv[first_i+i],rv[first_j+j]);
                    u2 = a2*r2;
                    vij= Math.exp(-u2);
                    fs = 2.*vij;
                    var dx = rv[first_i+i][0]  - rv[first_j+j][0];
                    var dy = rv[first_i+i][1]  - rv[first_j+j][1];
                    var dz = rv[first_i+i][2]  - rv[first_j+j][2];
                    fxij=fs*dx;
                    fyij=fs*dy;
                    fzij=fs*dz;

                    // forces [x,y,z,v]
                    fv[first_i+i][3] +=  qv[first_j+j]*vij;
                    fv[first_i+i][0] +=  qv[first_j+j]*fxij;
                    fv[first_i+i][1] +=  qv[first_j+j]*fyij;
                    fv[first_i+i][2] +=  qv[first_j+j]*fzij;
                }
            }
        }
    }
}

function runLavaMD(boxes1d) {
    return lavamd(boxes1d);
}
