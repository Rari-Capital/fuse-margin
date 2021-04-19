// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IPosition } from "../../interfaces/IPosition.sol";
import { CErc20Interface } from "../../interfaces/CErc20Interface.sol";

/// @author Ganesh Gautham Elango
/// @title Swapping and minting/borrowing/repaying/redeeming functions
contract Adapter {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @dev Uniswap V2 factory address
    address public immutable uniswapFactory;

    /// @param _uniswapFactory Uniswap V2 factory address
    constructor(address _uniswapFactory) {
        uniswapFactory = _uniswapFactory;
    }

    function _swap(
        address from,
        address to,
        uint256 amount,
        bytes memory exchangeData
    ) internal returns (uint256) {
        (address exchange, bytes memory data) = abi.decode(exchangeData, (address, bytes));
        IERC20(from).safeApprove(exchange, amount);
        (bool success, ) = exchange.call(data);
        if (!success) revert("Adapter: Swap failed");
        return IERC20(to).balanceOf(address(this));
    }

    function _mintAndBorrow(
        address position,
        address base,
        address quote,
        uint256 depositAmount,
        uint256 borrowAmount,
        bytes memory fusePool
    ) internal {
        (address comptroller, address cBase, address cQuote) = abi.decode(fusePool, (address, address, address));
        IERC20(base).safeTransfer(position, depositAmount);
        IPosition(position).mintAndBorrow(comptroller, base, cBase, quote, cQuote, depositAmount, borrowAmount);
    }

    function _repayAndRedeem(
        address position,
        address base,
        address quote,
        bytes memory fusePool
    ) internal returns (uint256) {
        (, address cBase, address cQuote) = abi.decode(fusePool, (address, address, address));
        uint256 redeemTokens = IERC20(cBase).balanceOf(position);
        uint256 repayAmount = CErc20Interface(cQuote).borrowBalanceCurrent(position);
        IERC20(quote).safeTransfer(position, repayAmount);
        IPosition(position).repayAndRedeem(base, cBase, quote, cQuote, redeemTokens, repayAmount);
        return repayAmount;
    }
}
