// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Updater {
    uint256 public number;

    function update() public  {
        number++;
    }
}
