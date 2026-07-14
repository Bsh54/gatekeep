// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {GatekeepEscrow} from "../src/GatekeepEscrow.sol";

contract GatekeepEscrowTest is Test {
    GatekeepEscrow escrow;
    address publicGoods = address(0xBEEF);
    address relayer = address(0xF00D);
    address recipient = address(0xA11CE);
    address sender = address(0xB0B);

    function setUp() public {
        escrow = new GatekeepEscrow(publicGoods, relayer);
        vm.deal(sender, 10 ether);
    }

    function _deposit(uint256 amount, uint256 window) internal returns (uint256 id) {
        vm.prank(sender);
        id = escrow.deposit{value: amount}(recipient, block.timestamp + window);
    }

    function test_DepositLocksFunds() public {
        uint256 id = _deposit(1 ether, 1 days);
        GatekeepEscrow.Message memory m = escrow.getMessage(id);
        assertEq(m.sender, sender);
        assertEq(m.recipient, recipient);
        assertEq(m.amount, 1 ether);
        assertEq(uint256(m.status), uint256(GatekeepEscrow.Status.Pending));
        assertEq(address(escrow).balance, 1 ether);
    }

    function test_RefundReturnsToSender() public {
        uint256 id = _deposit(1 ether, 1 days);
        uint256 before = sender.balance;
        vm.prank(recipient);
        escrow.refund(id);
        assertEq(sender.balance, before + 1 ether);
        assertEq(uint256(escrow.getMessage(id).status), uint256(GatekeepEscrow.Status.Refunded));
    }

    function test_RejectSendsToPublicGoods() public {
        uint256 id = _deposit(1 ether, 1 days);
        vm.prank(recipient);
        escrow.reject(id);
        assertEq(publicGoods.balance, 1 ether);
        assertEq(uint256(escrow.getMessage(id).status), uint256(GatekeepEscrow.Status.Donated));
    }

    function test_ReclaimAfterDeadline() public {
        uint256 id = _deposit(1 ether, 1 days);
        vm.warp(block.timestamp + 1 days + 1);
        uint256 before = sender.balance;
        vm.prank(sender);
        escrow.reclaim(id);
        assertEq(sender.balance, before + 1 ether);
        assertEq(uint256(escrow.getMessage(id).status), uint256(GatekeepEscrow.Status.Reclaimed));
    }

    function test_RevertReclaimBeforeDeadline() public {
        uint256 id = _deposit(1 ether, 1 days);
        vm.prank(sender);
        vm.expectRevert(GatekeepEscrow.DeadlineNotReached.selector);
        escrow.reclaim(id);
    }

    function test_RevertNonRecipientRefund() public {
        uint256 id = _deposit(1 ether, 1 days);
        vm.prank(sender);
        vm.expectRevert(GatekeepEscrow.NotRecipient.selector);
        escrow.refund(id);
    }

    function test_RelayerCanRefund() public {
        uint256 id = _deposit(1 ether, 1 days);
        uint256 before = sender.balance;
        vm.prank(relayer);
        escrow.refund(id);
        assertEq(sender.balance, before + 1 ether);
    }

    function test_RelayerCanReject() public {
        uint256 id = _deposit(1 ether, 1 days);
        vm.prank(relayer);
        escrow.reject(id);
        assertEq(publicGoods.balance, 1 ether);
    }

    function test_RevertZeroDeposit() public {
        vm.prank(sender);
        vm.expectRevert(GatekeepEscrow.ZeroDeposit.selector);
        escrow.deposit{value: 0}(recipient, block.timestamp + 1 days);
    }

    function test_RevertSelfMessage() public {
        vm.prank(sender);
        vm.expectRevert(GatekeepEscrow.InvalidRecipient.selector);
        escrow.deposit{value: 1 ether}(sender, block.timestamp + 1 days);
    }
}
