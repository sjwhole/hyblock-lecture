//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";


contract Counter {
    uint256 public count;

    function increment() public {
        count += 1;
        console.log("count is now: ", count);
    }

    function decrement() public {
        count -= 1;
        console.log("count is now: ", count);
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}