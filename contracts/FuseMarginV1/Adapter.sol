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
import { CErc20 } from "../interfaces/CErc20.sol";
import { Comptroller } from "../interfaces/Comptroller.sol";

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

    function _swap(address base, bytes memory exchangeData) internal returns (uint256) {
        uint256 initialBalance = IERC20(base).balanceOf(address(this));
        (address exchange, bytes memory data) = abi.decode(exchangeData, (address, bytes));

        (bool success, ) = exchange.call(data);
        if (!success) revert("Adapter: Swap failed");

        uint256 finalBalance = IERC20(base).balanceOf(address(this));
        return finalBalance.sub(initialBalance);
    }

    function _mintAndRedeem(
        address comptroller,
        address base,
        address cBase,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) internal {
        IERC20(base).safeApprove(cBase, depositAmount);
        CErc20(cBase).mint(depositAmount);

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        Comptroller(comptroller).enterMarkets(cTokens);

        CErc20(cQuote).borrow(borrowAmount);
    }
}
