// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IFuseMarginController } from "../interfaces/IFuseMarginController.sol";
import { IOwnable } from "../interfaces/IOwnable.sol";
import { IFuseMarginV1 } from "../interfaces/IFuseMarginV1.sol";

/// @author Ganesh Gautham Elango
/// @title FuseMargin contract base
abstract contract FuseMarginBase is IFuseMarginV1 {
    using SafeERC20 for IERC20;

    /// @dev FuseMarginController contract
    IFuseMarginController public immutable override fuseMarginController;

    /// @param _fuseMarginController FuseMarginController address
    constructor(address _fuseMarginController) {
        fuseMarginController = IFuseMarginController(_fuseMarginController);
    }

    /// @dev Checks if caller is controller owner
    modifier isControllerOwner() {
        require(msg.sender == IOwnable(address(fuseMarginController)).owner(), "FuseMarginV1: Not owner of position");
        _;
    }

    /// @dev Allows for generalized calls through this contract
    /// @param target Contract address to call
    /// @param callData ABI encoded function/params
    /// @return Whether call was successful
    /// @return Return bytes
    function proxyCall(address target, bytes calldata callData)
        external
        payable
        isControllerOwner
        returns (bool, bytes memory)
    {
        (bool success, bytes memory result) = target.call{ value: msg.value }(callData);
        return (success, result);
    }

    /// @dev Transfer ETH balance
    /// @param to Address to send to
    /// @param amount Amount of ETH to send
    function transferETH(address payable to, uint256 amount) external isControllerOwner {
        to.transfer(amount);
    }

    /// @dev Transfers token balance
    /// @param token Token address
    /// @param to Transfer to address
    /// @param amount Amount to transfer
    function transferToken(
        address token,
        address to,
        uint256 amount
    ) external isControllerOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
