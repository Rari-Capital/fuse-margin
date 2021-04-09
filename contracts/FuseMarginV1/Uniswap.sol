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
            address comptroller,
            address base,
            address cBase,
            address quote,
            address cQuote,
            address pairToken,
            uint256 providedAmount,
            bytes memory exchangeData
        ) = abi.decode(data, (address, address, address, address, address, address, address, uint256, bytes));
        require(
            msg.sender == uniswapFactory.getPair(quote, pairToken),
            "Uniswap: only permissioned UniswapV2 pair can call"
        );
        uint256 amount = amount0 > 0 ? amount0 : amount1;

        // This contract now has the funds requested
        // Your logic goes here

        // Approve the pair contract to pull the owed amount + flashFee
        IERC20(quote).transfer(msg.sender, amount.add(amount.mul(3).div(997).add(1)));
    }
}
