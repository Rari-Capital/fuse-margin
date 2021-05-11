// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Callee } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import { UniswapV2Library } from "../libraries/UniswapV2Library.sol";
import { IPosition } from "../interfaces/IPosition.sol";
import { CErc20Interface } from "../interfaces/CErc20Interface.sol";

/// @author Ganesh Gautham Elango
/// @title Uniswap flash loan contract
contract Uniswap is IUniswapV2Callee {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @dev Uniswap V2 factory address
    address public immutable uniswapFactory;

    /// @param _uniswapFactory Uniswap V2 factory address
    constructor(address _uniswapFactory) {
        uniswapFactory = _uniswapFactory;
    }

    /// @dev Uniswap flash loan/swap callback. Receives the token amount and gives it back + fees
    /// @param sender The msg.sender who called the Uniswap pair
    /// @param amount0 Amount of token0 received
    /// @param amount1 Amount of token1 received
    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(sender == address(this), "FuseMarginV1: Only this contract may initiate");
        (
            uint256 action,
            address user,
            address position,
            address base,
            address quote,
            address pairToken,
            bytes memory fusePool,
            bytes memory exchangeData
        ) = abi.decode(data, (uint256, address, address, address, address, address, bytes, bytes));
        uint256 amount = amount0 > 0 ? amount0 : amount1;
        if (action == 0) {
            require(
                msg.sender == UniswapV2Library.pairFor(uniswapFactory, quote, pairToken),
                "FuseMarginV1: only permissioned UniswapV2 pair can call"
            );
            _openPositionBaseUniswap(amount, position, base, quote, fusePool, exchangeData);
        } else if (action == 1) {
            require(
                msg.sender == UniswapV2Library.pairFor(uniswapFactory, base, pairToken),
                "FuseMarginV1: only permissioned UniswapV2 pair can call"
            );
            _closePositionBaseUniswap(amount, user, position, base, quote, fusePool, exchangeData);
        }
    }

    function _openPositionBaseUniswap(
        uint256 amount,
        address position,
        address base,
        address quote,
        bytes memory fusePool,
        bytes memory exchangeData
    ) internal {
        uint256 depositAmount = _swap(quote, base, amount, exchangeData);
        _mintAndBorrow(position, base, quote, depositAmount, _uniswapLoanFees(amount), fusePool);
        // Send the pair the owed amount + flashFee
        IERC20(quote).safeTransfer(msg.sender, _uniswapLoanFees(amount));
    }

    function _closePositionBaseUniswap(
        uint256 amount,
        address user,
        address position,
        address base,
        address quote,
        bytes memory fusePool,
        bytes memory exchangeData
    ) internal {
        uint256 receivedAmount = _swap(base, quote, amount, exchangeData);
        uint256 leftoverAmount = receivedAmount.sub(_repayAndRedeem(position, base, quote, fusePool));
        // Send the pair the owed amount + flashFee
        IERC20(base).safeTransfer(msg.sender, _uniswapLoanFees(amount));
        // Send the user the profit + leftover dust tokens
        IERC20(base).safeTransfer(user, IERC20(base).balanceOf(address(this)));
        IERC20(quote).safeTransfer(user, leftoverAmount);
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
        if (!success) revert("FuseMarginV1: Swap failed");
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

    function _uniswapLoanFees(uint256 amount) internal pure returns (uint256) {
        return amount.add(amount.mul(3).div(997).add(1));
    }
}
