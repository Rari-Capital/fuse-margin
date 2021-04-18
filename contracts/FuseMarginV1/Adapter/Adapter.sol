// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Callee } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import { ISoloMargin } from "../../interfaces/ISoloMargin.sol";
import { ICallee } from "../../interfaces/ICallee.sol";
import { IPosition } from "../../interfaces/IPosition.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan contract
abstract contract Adapter is IUniswapV2Callee, ICallee {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public immutable uniswapFactory;
    ISoloMargin public immutable soloMargin;

    mapping(address => uint256) internal tokenAddressToMarketId;

    /// @param _uniswapFactory Uniswap V2 factory address
    /// @param _soloMargin DYDX solo margin address
    constructor(address _uniswapFactory, address _soloMargin) {
        uniswapFactory = _uniswapFactory;
        soloMargin = ISoloMargin(_soloMargin);
        // Setup state variables
        uint256 numMarkets = ISoloMargin(_soloMargin).getNumMarkets();
        for (uint256 marketId = 0; marketId < numMarkets; marketId++) {
            address token = ISoloMargin(_soloMargin).getMarketTokenAddress(marketId);
            tokenAddressToMarketId[token] = marketId;
        }
    }

    function _swap(
        address base,
        address quote,
        uint256 amount,
        bytes memory exchangeData
    ) internal returns (uint256) {
        (address exchange, bytes memory data) = abi.decode(exchangeData, (address, bytes));
        IERC20(quote).safeApprove(exchange, amount);
        (bool success, ) = exchange.call(data);
        if (!success) revert("Adapter: Swap failed");
        return IERC20(base).balanceOf(address(this));
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
        uint256 redeemTokens,
        uint256 repayAmount,
        bytes memory fusePool
    ) internal {
        (, address cBase, address cQuote) = abi.decode(fusePool, (address, address, address));
        // uint256 repayAmount = CErc20Interface(cQuote).borrowBalanceCurrent(position);
        IERC20(quote).safeTransfer(position, repayAmount);
        IPosition(position).repayAndRedeem(base, cBase, quote, cQuote, redeemTokens, repayAmount);
    }
}
