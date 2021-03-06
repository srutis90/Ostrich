/*
  Copyright (c)2008-2011 University of Virginia
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted without royalty fees or other restrictions, provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    * Neither the name of the University of Virginia, the Dept. of Computer Science, nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE UNIVERSITY OF VIRGINIA OR THE SOFTWARE AUTHORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/



#define BLOCK_SIZE 16

int
maximum( int a,
		int b,
		int c){

	int k;
	if( a <= b )
		k = b;
	else
		k = a;

	if( k <=c )
		return(c);
	else
		return(k);

}

	__kernel void
needle_opencl_shared_1(  __global int* referrence,
		__global int* matrix_opencl,
		int cols,
		int penalty,
		int i,
		int block_width)
{
	int bx = get_group_id(0);
	int tx = get_local_id(0);

	int b_index_x = bx;
	int b_index_y = i - 1 - bx;
	int index   = cols * BLOCK_SIZE * b_index_y + BLOCK_SIZE * b_index_x + tx + ( cols + 1 );

	//This pattern at EACH loop step employes a variable number of threads to work in a wavefront pattern. I.e., first iteration only [1][1] is calculated
	//second iteration [2][1] and [1][2], third iteration [3][1] and [2][2] and [1][3], etc. Before each loop iteration starts the barrier ensures that
	//all values needed in the next step have been calculated and stored in local memory in temp.
	//This whole loop calculates up to the main anti-diagonal, i.e., [1][4] along [4][1].
	for( int m = 0 ; m < BLOCK_SIZE ; m++){

		if ( tx <= m ){

			int ref_x=index+(m-tx)*cols;

			matrix_opencl[ref_x] = maximum( matrix_opencl[ref_x-(cols+1)] + referrence[ref_x],
					matrix_opencl[ref_x-1]  - penalty,
					matrix_opencl[ref_x-cols]  - penalty);

		}

		barrier(CLK_GLOBAL_MEM_FENCE);

	}

	//Same as above, but for the lower right part of the matrix.
	for( int m = BLOCK_SIZE - 2 ; m >=0 ; m--){

		if ( tx <= m){

			int ref_x=index+(m-tx)*cols+(cols+1)*(BLOCK_SIZE-1-m);

			matrix_opencl[ref_x] = maximum( matrix_opencl[ref_x-(cols+1)] + referrence[ref_x],
					matrix_opencl[ref_x-1]  - penalty,
					matrix_opencl[ref_x-cols]  - penalty);

		}

		barrier(CLK_GLOBAL_MEM_FENCE);
	}

}


	__kernel void
needle_opencl_shared_2(  __global int* referrence,
		__global int* matrix_opencl,
		int cols,
		int penalty,
		int i,
		int block_width)
{

	int bx = get_group_id(0);
	int tx = get_local_id(0);

	int b_index_x = bx + block_width - i  ;
	int b_index_y = block_width - bx -1;
	int index   = cols * BLOCK_SIZE * b_index_y + BLOCK_SIZE * b_index_x + tx + ( cols + 1 );

	for( int m = 0 ; m < BLOCK_SIZE ; m++){

		if ( tx <= m ){

			int ref_x=index+(m-tx)*cols;

			matrix_opencl[ref_x] = maximum( matrix_opencl[ref_x-(cols+1)] + referrence[ref_x],
					matrix_opencl[ref_x-1]  - penalty,
					matrix_opencl[ref_x-cols]  - penalty);

		}

		barrier(CLK_GLOBAL_MEM_FENCE);

	}


	for( int m = BLOCK_SIZE - 2 ; m >=0 ; m--){

		if ( tx <= m){

			int ref_x=index+(m-tx)*cols+(cols+1)*(BLOCK_SIZE-1-m);

			matrix_opencl[ref_x] = maximum( matrix_opencl[ref_x-(cols+1)] + referrence[ref_x],
					matrix_opencl[ref_x-1]  - penalty,
					matrix_opencl[ref_x-cols]  - penalty);

		}

		barrier(CLK_GLOBAL_MEM_FENCE);
	}

}
