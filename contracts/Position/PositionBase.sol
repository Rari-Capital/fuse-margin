// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import { IFuseMarginController } from "../interfaces/IFuseMarginController.sol";
import { IPosition } from "../interfaces/IPosition.sol";

/// @author Ganesh Gautham Elango
/// @title Base contract for positions
abstract contract PositionBase is IPosition, Initializable {
    /// @dev Points to immutable FuseMarginController instance
    IFuseMarginController public override fuseMarginController;

    /// @dev Version of position contract
    uint256 public constant override version = 0;

    /// @dev Initializes the contract once after creation
    /// @param _fuseMarginController Address of FuseMarginController
    function initialize(IFuseMarginController _fuseMarginController) external override initializer {
        fuseMarginController = _fuseMarginController;
    }

    /// @dev Fallback for reciving Ether
    receive() external payable {}

    /// @dev Ensures functions are called from approved FuseMargin contracts
    modifier onlyMargin() {
        require(fuseMarginController.approvedContracts(msg.sender), "Position: Not approved contract");
        _;
    }

    /// @dev Allows for generalized calls through this position
    /// @param target Contract address to call
    /// @param callData ABI encoded function/params
    /// @return Whether call was successful
    /// @return Return bytes
    function proxyCall(address target, bytes calldata callData)
        external
        payable
        override
        onlyMargin
        returns (bool, bytes memory)
    {
        (bool success, bytes memory result) = target.call{ value: msg.value }(callData);
        return (success, result);
    }

    /// @dev Allows for batched generalized calls through this position
    /// @param targets Contract addresses to call
    /// @param callDatas ABI encoded function/params
    /// @return Whether calls were successful
    /// @return Return bytes
    function proxyMulticall(address[] calldata targets, bytes[] calldata callDatas)
        external
        override
        onlyMargin
        returns (bool[] memory, bytes[] memory)
    {
        bool[] memory successes = new bool[](targets.length);
        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (successes[i], results[i]) = targets[i].call(callDatas[i]);
        }
        return (successes, results);
    }

    /// @dev Delegate call
    /// @param target Contract address to delegatecall
    /// @param callData ABI encoded function/params
    /// @return Whether call was successful
    /// @return Return bytes
    function delegatecall(address target, bytes calldata callData)
        external
        payable
        override
        onlyMargin
        returns (bool, bytes memory)
    {
        (bool success, bytes memory result) = target.delegatecall(callData);
        return (success, result);
    }

    /// @dev Transfer ETH balance
    /// @param to Address to send to
    /// @param amount Amount of ETH to send
    function transferETH(address payable to, uint256 amount) external override onlyMargin {
        to.transfer(amount);
    }
}
