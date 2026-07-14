// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {GatekeepEscrow} from "../src/GatekeepEscrow.sol";

contract Deploy is Script {
    function run() external {
        // Public-goods destination for rejected (spam) deposits.
        // Override with env PUBLIC_GOODS; falls back to the deployer for local runs.
        address publicGoods = vm.envOr("PUBLIC_GOODS", msg.sender);

        vm.startBroadcast();
        GatekeepEscrow escrow = new GatekeepEscrow(publicGoods);
        vm.stopBroadcast();

        console.log("GatekeepEscrow deployed at:", address(escrow));
        console.log("Public goods address:", publicGoods);
    }
}
