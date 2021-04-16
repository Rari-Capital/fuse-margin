// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { Adapter } from "./Adapter.sol";

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
            address position,
            address base,
            address quote,
            address pairToken,
            bytes memory fusePool,
            bytes memory exchangeData
        ) = abi.decode(data, (address, address, address, address, bytes, bytes));
        require(
            msg.sender == uniswapFactory.getPair(quote, pairToken),
            "Uniswap: only permissioned UniswapV2 pair can call"
        );
        uint256 amount = amount0 > 0 ? amount0 : amount1;
        uint256 depositAmount = _swap(base, quote, amount, exchangeData);
        _mintAndRedeem(position, base, quote, depositAmount, _uniswapLoanFees(amount), fusePool);
        // Send the pair the owed amount + flashFee
        IERC20(quote).transfer(msg.sender, _uniswapLoanFees(amount));
    }

    function _uniswapLoanFees(uint256 amount) internal pure returns (uint256) {
        return amount.add(amount.mul(3).div(997).add(1));
    }
}
