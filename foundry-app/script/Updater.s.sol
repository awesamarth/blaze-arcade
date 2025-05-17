// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Updater} from "../src/Updater.sol";

contract UpdaterScript is Script {
    Updater public updater;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        
        updater = new Updater();
        
        vm.stopBroadcast();
        
    }
}