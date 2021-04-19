// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { UniswapV2Library } from "../../libraries/UniswapV2Library.sol";
import { Adapter } from "../Adapter/Adapter.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan contract
abstract contract Uniswap is Adapter {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @dev Uniswap flash loan/swap callback. Receives the token amount and gives it back + fees
    /// @param sender The msg.sender to Solo
    /// @param amount0 Amount of token0 received
    /// @param amount1 Amount of token1 received
    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(sender == address(this), "Uniswap: Only this contract may initiate");
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
                "Uniswap: only permissioned UniswapV2 pair can call"
            );
            _openPositionBaseUniswap(amount, position, base, quote, fusePool, exchangeData);
        } else if (action == 1) {
            require(
                msg.sender == UniswapV2Library.pairFor(uniswapFactory, quote, pairToken),
                "Uniswap: only permissioned UniswapV2 pair can call"
            );
        } else if (action == 2) {
            require(
                msg.sender == UniswapV2Library.pairFor(uniswapFactory, base, pairToken),
                "Uniswap: only permissioned UniswapV2 pair can call"
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
        IERC20(quote).transfer(msg.sender, _uniswapLoanFees(amount));
    }

    function _openPositionQuoteUniswap(
        uint256 amount,
        address position,
        address base,
        address quote,
        bytes memory fusePool,
        bytes memory exchangeData
    ) internal {
        uint256 depositAmount = _swap(quote, base, amount.add(IERC20(quote).balanceOf(address(this))), exchangeData);
        _mintAndBorrow(position, base, quote, depositAmount, _uniswapLoanFees(amount), fusePool);
        // Send the pair the owed amount + flashFee
        IERC20(quote).transfer(msg.sender, _uniswapLoanFees(amount));
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
        IERC20(base).transfer(msg.sender, _uniswapLoanFees(amount));
        IERC20(base).transfer(user, IERC20(base).balanceOf(address(this)));
        IERC20(quote).transfer(user, leftoverAmount);
    }

    function _closePositionQuoteUniswap(
        uint256 amount,
        address user,
        address position,
        address base,
        address quote,
        bytes memory fusePool,
        bytes memory exchangeData
    ) internal {
        _repayAndRedeemQuote(position, base, quote, amount, fusePool);
        uint256 receivedAmount = _swap(base, quote, IERC20(base).balanceOf(address(this)), exchangeData);
        IERC20(quote).transfer(msg.sender, _uniswapLoanFees(amount));
        IERC20(base).transfer(user, receivedAmount);
        IERC20(quote).transfer(user, IERC20(quote).balanceOf(address(this)));
    }

    function _uniswapLoanFees(uint256 amount) internal pure returns (uint256) {
        return amount.add(amount.mul(3).div(997).add(1));
    }
}
