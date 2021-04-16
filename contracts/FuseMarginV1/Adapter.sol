// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Callee } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { ISoloMargin } from "../interfaces/ISoloMargin.sol";
import { ICallee } from "../interfaces/ICallee.sol";
import { DYDXDataTypes } from "../libraries/DYDXDataTypes.sol";
import { IPosition } from "../interfaces/IPosition.sol";
import { CErc20Interface } from "../interfaces/CErc20Interface.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan contract
abstract contract Adapter is IUniswapV2Callee, ICallee {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IUniswapV2Factory public immutable uniswapFactory;
    ISoloMargin public immutable soloMargin;

    mapping(address => uint256) internal tokenAddressToMarketId;

    /// @param _uniswapFactory Uniswap V2 factory address
    /// @param _soloMargin DYDX solo margin address
    constructor(address _uniswapFactory, address _soloMargin) {
        uniswapFactory = IUniswapV2Factory(_uniswapFactory);
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

    function _mintAndRedeem(
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
}
